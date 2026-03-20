import os
import json
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY")

# In-memory storage for hackathon simplicity (Replace with DB or Hindsight natively)
db = {
    "users": {},
    "subjects": {},
    "history": {}
}

# Helper to index interactions to Hindsight
def log_to_hindsight(user_id, event_type, data):
    if not HINDSIGHT_API_KEY:
        return
    # Assuming standard REST API for Hindsight memory
    try:
        url = "https://api.vectorize.io/v1/hindsight/events" # Hypothetical endpoint, adapt as needed
        headers = {
            "Authorization": f"Bearer {HINDSIGHT_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "user_id": user_id,
            "event_type": event_type,
            "data": data
        }
        requests.post(url, headers=headers, json=payload, timeout=2)
    except Exception as e:
        print(f"Hindsight log failed: {e}")

def call_groq_api(prompt=None, messages=None, temperature=0.7, json_mode=False):
    if not GROQ_API_KEY:
        raise ValueError("Groq API key missing")
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Use provided messages array or build one from a simple prompt
    req_messages = messages if messages else [{"role": "user", "content": prompt}]
    
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": req_messages,
        "temperature": temperature
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
        
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]

@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    user_id = data.get("user_id")
    if user_id:
        db["users"][user_id] = data
        log_to_hindsight(user_id, "register", data)
    return jsonify({"status": "success", "message": "User registered"})

@app.route("/api/subjects/save", methods=["POST"])
def save_subjects():
    data = request.json
    user_id = data.get("user_id")
    if user_id:
        db["subjects"][user_id] = {
            "subjects": data.get("subjects", []),
            "custom_subjects": data.get("custom_subjects", [])
        }
        log_to_hindsight(user_id, "save_subjects", data)
    return jsonify({"status": "success", "message": "Subjects saved"})

@app.route("/api/ai/study-plan", methods=["POST"])
def generate_study_plan():
    data = request.json
    user_id = data.get("user_id")
    
    user_subjects = db["subjects"].get(user_id, {}).get("subjects", ["Mathematics", "Science"])
    if not user_subjects:
        user_subjects = ["Mathematics", "Science"]
        
    if not GROQ_API_KEY:
        return jsonify({"error": "Groq API key missing"}), 500

    prompt = f"""
    You are an expert AI tutor. Generate a personalized 6-day study plan for a student who is learning: {', '.join(user_subjects)}.
    Return ONLY a valid JSON object with a single key 'plan' containing an array of exactly 6 objects. 
    Each object must have:
    - "day" (Monday to Saturday)
    - "subject" (Pick one from the user's subjects)
    - "type" ("focus", "practice", or "review")
    - "reason" (A short 4-5 word reason)
    """

    try:
        content = call_groq_api(prompt, temperature=0.7, json_mode=True)
        plan_data = json.loads(content)
        log_to_hindsight(user_id, "study_plan_generated", plan_data)
        return jsonify(plan_data)
    except Exception as e:
        print(f"Error generating study plan: {e}")
        return jsonify({"error": "Failed to generate study plan"}), 500

@app.route("/api/ai/why-wrong", methods=["POST"])
def why_wrong():
    data = request.json
    user_id = data.get("user_id")
    question = data.get("question")
    topic = data.get("topic")
    wrong_answer = data.get("wrong_answer")
    correct_answer = data.get("correct_answer")
    
    if not GROQ_API_KEY:
        return jsonify({"error": "Groq API key missing"}), 500
        
    prompt = f"""
    The student is studying {topic}.
    Question: {question}
    The student answered: '{wrong_answer}'.
    The correct answer is: '{correct_answer}'.
    
    In 1 or 2 concise, encouraging sentences, explain why their answer was incorrect and how to understand the correct answer. Do not use markdown styling.
    """
    
    try:
        explanation = call_groq_api(prompt, temperature=0.5, json_mode=False).strip()
        
        # Log the mistake to Hindsight so the AI "remembers" it
        log_to_hindsight(user_id, "question_mistake", {
            "topic": topic, "question": question, "mistake": wrong_answer
        })
        
        return jsonify({"explanation": explanation})
    except Exception as e:
        print(f"Error generating explanation: {e}")
        return jsonify({"error": "Failed to generate explanation"}), 500

@app.route("/api/questions/<subject>", methods=["GET"])
def get_questions(subject):
    if not GROQ_API_KEY:
         return jsonify({"error": "Groq API key missing"}), 500
         
    prompt = f"""
    Generate exactly 5 multiple-choice or short-answer style quiz questions for the subject: {subject}.
    Return ONLY a valid JSON object with a single key 'questions' containing an array of 5 objects.
    Each object must have EXACTLY these fields:
    - "id" (a unique string like q1, q2)
    - "topic" (subtopic within {subject})
    - "question" (the question text)
    - "answer" (the correct answer in 1-4 words max)
    - "difficulty" ("easy", "medium", or "hard")
    """
    
    try:
        content = call_groq_api(prompt, temperature=0.7, json_mode=True)
        result = json.loads(content)
        return jsonify(result["questions"])
    except Exception as e:
        print(f"Error generating questions: {e}")
        return jsonify({"error": "Failed to generate questions"}), 500

@app.route("/api/ai/tutor-chat", methods=["POST"])
def tutor_chat():
    data = request.json
    user_id = data.get("user_id")
    message = data.get("message")
    history = data.get("history", []) # format: [{"role": "user"/"assistant", "content": "..."}]
    subject = data.get("subject", "general studies")
    
    if not GROQ_API_KEY:
        return jsonify({"error": "Groq API key missing"}), 500
        
    system_prompt = {
        "role": "system", 
        "content": f"You are StudyMind, a helpful, encouraging AI tutor helping a student with {subject}. Keep explanations highly concise and interactive."
    }
    
    try:
        req_messages = [system_prompt] + history + [{"role": "user", "content": message}]
        response_text = call_groq_api(messages=req_messages, temperature=0.6, json_mode=False)
        
        # Log conversation to Hindsight Memory
        log_to_hindsight(user_id, "tutor_interaction", {
            "subject": subject,
            "user_message": message,
            "ai_response": response_text
        })
        
        return jsonify({"response": response_text})
    except Exception as e:
        print(f"Error in tutor chat: {e}")
        return jsonify({"error": "Failed to communicate with AI tutor"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
