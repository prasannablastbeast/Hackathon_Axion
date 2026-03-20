/* ============================================
   STUDYMIND AI — quiz.js
   Full quiz logic:
   - Subject selector
   - Timed mode
   - Answer checking
   - Feedback
   - "Why wrong?" AI button
   - XP & badges
   - Spaced repetition update
   - Result screen
   ============================================ */

// ── Question bank (backend teammate replaces with API) ──
const QUESTION_BANK = {
  'Mathematics': [
    { id: 'm1', topic: 'Algebra',        question: 'Solve for x: 2x + 5 = 15',                         answer: '5',         difficulty: 'easy'   },
    { id: 'm2', topic: 'Algebra',        question: 'Solve for x: 3x - 7 = 2x + 5',                     answer: '12',        difficulty: 'medium' },
    { id: 'm3', topic: 'Geometry',       question: 'Area of a circle with radius 7 (use π = 3.14)?',   answer: '153.86',    difficulty: 'medium' },
    { id: 'm4', topic: 'Multiplication', question: 'What is 12 × 8?',                                   answer: '96',        difficulty: 'easy'   },
    { id: 'm5', topic: 'Geometry',       question: 'Perimeter of a rectangle 8cm × 5cm?',              answer: '26',        difficulty: 'easy'   },
    { id: 'm6', topic: 'Fractions',      question: 'What is 3/4 + 1/4?',                               answer: '1',         difficulty: 'easy'   },
    { id: 'm7', topic: 'Algebra',        question: 'If y = 2x + 3, what is y when x = 4?',             answer: '11',        difficulty: 'medium' },
    { id: 'm8', topic: 'Statistics',     question: 'Mean of 4, 8, 6, 10, 2?',                          answer: '6',         difficulty: 'medium' },
  ],
  'Science': [
    { id: 's1', topic: 'Photosynthesis', question: 'Which gas do plants absorb during photosynthesis?', answer: 'co2',       difficulty: 'easy'   },
    { id: 's2', topic: 'Physics',        question: "Newton's second law formula?",                      answer: 'f=ma',      difficulty: 'easy'   },
    { id: 's3', topic: 'Chemistry',      question: 'Atomic number of Carbon?',                          answer: '6',         difficulty: 'easy'   },
    { id: 's4', topic: 'Physics',        question: 'Unit of electric current?',                         answer: 'ampere',    difficulty: 'easy'   },
    { id: 's5', topic: 'Biology',        question: 'Powerhouse of the cell?',                           answer: 'mitochondria', difficulty: 'easy' },
    { id: 's6', topic: 'Chemistry',      question: 'Chemical symbol for Gold?',                         answer: 'au',        difficulty: 'medium' },
    { id: 's7', topic: 'Physics',        question: 'Speed of light (approx, in km/s)?',                 answer: '300000',    difficulty: 'medium' },
    { id: 's8', topic: 'Biology',        question: 'How many chromosomes in a human cell?',             answer: '46',        difficulty: 'medium' },
  ],
  'History': [
    { id: 'h1', topic: 'Indian History', question: 'Year India gained independence?',                   answer: '1947',      difficulty: 'easy'   },
    { id: 'h2', topic: 'World History',  question: 'First President of the USA?',                       answer: 'george washington', difficulty: 'easy' },
    { id: 'h3', topic: 'Indian History', question: 'Who wrote the Indian National Anthem?',             answer: 'rabindranath tagore', difficulty: 'medium' },
    { id: 'h4', topic: 'World History',  question: 'Year World War II ended?',                          answer: '1945',      difficulty: 'easy'   },
    { id: 'h5', topic: 'Indian History', question: 'First Prime Minister of India?',                    answer: 'jawaharlal nehru', difficulty: 'easy' },
    { id: 'h6', topic: 'World History',  question: 'Which country launched Sputnik 1?',                 answer: 'soviet union', difficulty: 'medium' },
  ],
  'English': [
    { id: 'e1', topic: 'Grammar',        question: 'Plural of "child"?',                               answer: 'children',  difficulty: 'easy'   },
    { id: 'e2', topic: 'Grammar',        question: 'Opposite of "benevolent"?',                        answer: 'malevolent',difficulty: 'hard'   },
    { id: 'e3', topic: 'Vocabulary',     question: 'Synonym for "happy"?',                             answer: 'joyful',    difficulty: 'easy'   },
    { id: 'e4', topic: 'Grammar',        question: 'Correct: "He don\'t know" or "He doesn\'t know"?', answer: 'he doesn\'t know', difficulty: 'easy' },
    { id: 'e5', topic: 'Vocabulary',     question: 'Antonym of "ancient"?',                            answer: 'modern',    difficulty: 'easy'   },
    { id: 'e6', topic: 'Literature',     question: 'Author of "Romeo and Juliet"?',                    answer: 'shakespeare',difficulty: 'easy'  },
  ],
  'Geography': [
    { id: 'g1', topic: 'World',          question: 'Largest ocean in the world?',                      answer: 'pacific',   difficulty: 'easy'   },
    { id: 'g2', topic: 'India',          question: 'Longest river in India?',                          answer: 'ganga',     difficulty: 'easy'   },
    { id: 'g3', topic: 'World',          question: 'Capital of Australia?',                            answer: 'canberra',  difficulty: 'medium' },
    { id: 'g4', topic: 'India',          question: 'Which state is called the "Land of Five Rivers"?', answer: 'punjab',    difficulty: 'medium' },
    { id: 'g5', topic: 'World',          question: 'Tallest mountain in the world?',                   answer: 'mount everest', difficulty: 'easy' },
    { id: 'g6', topic: 'Climate',        question: 'Layer of atmosphere closest to Earth?',            answer: 'troposphere',difficulty: 'medium'},
  ],
  'Computer Science': [
    { id: 'c1', topic: 'Basics',         question: 'Full form of CPU?',                                answer: 'central processing unit', difficulty: 'easy' },
    { id: 'c2', topic: 'Programming',    question: 'Which language uses indentation as syntax?',       answer: 'python',    difficulty: 'easy'   },
    { id: 'c3', topic: 'Networking',     question: 'Full form of HTTP?',                              answer: 'hypertext transfer protocol', difficulty: 'medium' },
    { id: 'c4', topic: 'Data Structures',question: 'LIFO data structure?',                            answer: 'stack',     difficulty: 'medium' },
    { id: 'c5', topic: 'Basics',         question: '1 byte = how many bits?',                         answer: '8',         difficulty: 'easy'   },
    { id: 'c6', topic: 'Programming',    question: 'Boolean values are?',                             answer: 'true and false', difficulty: 'easy' },
    { id: 'c7', topic: 'Data Structures',question: 'FIFO data structure?',                            answer: 'queue',     difficulty: 'easy'   },
  ],
};

// ── Quiz state ──
let state = {
  subject:       '',
  questions:     [],
  current:       0,
  correctCount:  0,
  wrongAnswers:  [],
  timerOn:       false,
  timerDuration: 30,
  timerInterval: null,
  timeLeft:      30,
  xpThisQuiz:    0,
  answered:      false,
};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  if (!isOnboardingDone())          { window.location.href = 'onboarding.html'; return; }
  if (getSelectedSubjects().length === 0) { window.location.href = 'subjects.html'; return; }

  buildNavbar('quiz');

  // Load timer preference
  state.timerOn       = loadData(KEYS.TIMER_MODE, false);
  state.timerDuration = 30;
  syncTimerUI();

  // Build subject grid
  buildSubjectGrid();

  // Check URL param ?subject=Mathematics
  const urlSubject = new URLSearchParams(window.location.search).get('subject');
  if (urlSubject && getSelectedSubjects().includes(urlSubject)) {
    selectSubjectCard(urlSubject);
  }

  // Enter key submits answer
  document.getElementById('answer-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitAnswer();
  });
});

// ============================================
// SUBJECT GRID
// ============================================
function buildSubjectGrid() {
  const subjects = getSelectedSubjects();
  const grid     = document.getElementById('ss-grid');
  if (!grid) return;

  grid.innerHTML = subjects.map(s => {
    const qCount = (QUESTION_BANK[s] || []).length;
    return `
      <div class="ss-card" data-subject="${s}" onclick="selectSubjectCard('${s}')">
        <span class="ss-icon">${getSubjectIcon(s)}</span>
        <span class="ss-name">${s}</span>
        <span class="ss-count">${qCount} questions</span>
      </div>
    `;
  }).join('');

  // If no questions for a custom subject — show placeholder
  if (subjects.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted)">No subjects selected. <a href="subjects.html">Add subjects →</a></p>`;
  }
}

function selectSubjectCard(name) {
  document.querySelectorAll('.ss-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`.ss-card[data-subject="${name}"]`);
  if (card) card.classList.add('selected');
  state.subject = name;
}

// ============================================
// TIMER CONTROLS
// ============================================
function toggleTimer() {
  state.timerOn = !state.timerOn;
  saveData(KEYS.TIMER_MODE, state.timerOn);
  syncTimerUI();
}

function setDuration(btn, secs) {
  document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.timerDuration = secs;
}

function syncTimerUI() {
  const toggle = document.getElementById('timer-toggle');
  if (toggle) toggle.classList.toggle('on', state.timerOn);
}

// ============================================
// START QUIZ
// ============================================
function startQuiz() {
  if (!state.subject) {
    showToast('Please select a subject first!', 'error');
    return;
  }

  // Load questions for this subject
  // Backend teammate: replace with → const data = await apiCall(`/api/questions/${state.subject}`);
  let bank = QUESTION_BANK[state.subject] || [];

  // If custom subject with no questions
  if (bank.length === 0) {
    showToast(`No questions available for ${state.subject} yet. Your backend teammate will add them!`, 'warning', 4000);
    bank = [
      { id: 'custom1', topic: 'General', question: `Sample question for ${state.subject}?`, answer: 'answer', difficulty: 'easy' }
    ];
  }

  // Shuffle & take 5
  state.questions    = shuffle([...bank]).slice(0, 5);
  state.current      = 0;
  state.correctCount = 0;
  state.wrongAnswers = [];
  state.xpThisQuiz   = 0;

  // Show quiz UI
  document.getElementById('subject-selector').style.display = 'none';
  document.getElementById('quiz-active').classList.add('show');
  document.getElementById('result-screen').classList.remove('show');

  // Update subject pill
  document.getElementById('qa-subject-icon').textContent = getSubjectIcon(state.subject);
  document.getElementById('qa-subject-name').textContent = state.subject;

  loadQuestion();
}

// ============================================
// LOAD QUESTION
// ============================================
function loadQuestion() {
  const q   = state.questions[state.current];
  const pct = (state.current / state.questions.length) * 100;

  // Update progress
  document.getElementById('qa-progress').style.width  = pct + '%';
  document.getElementById('qa-counter').textContent   = `${state.current + 1} / ${state.questions.length}`;
  document.getElementById('q-number').textContent     = `Question ${state.current + 1}`;
  document.getElementById('q-topic').textContent      = `📌 ${q.topic}`;
  document.getElementById('q-text').textContent       = q.question;

  // Reset answer input
  const input = document.getElementById('answer-input');
  input.value    = '';
  input.disabled = false;
  input.focus();

  // Reset submit btn
  const btn = document.getElementById('submit-btn');
  btn.disabled    = false;
  btn.textContent = 'Submit';

  // Hide feedback & next btn
  document.getElementById('feedback-box').classList.remove('show', 'correct', 'wrong');
  document.getElementById('why-wrong-wrap').classList.remove('show');
  document.getElementById('ai-explanation').classList.remove('show');
  document.getElementById('next-btn-wrap').classList.remove('show');

  state.answered = false;

  // Start timer
  if (state.timerOn) startTimer();
  else document.getElementById('timer-display').style.display = 'none';
}

// ============================================
// TIMER
// ============================================
function startTimer() {
  stopTimer();
  state.timeLeft = state.timerDuration;
  const display  = document.getElementById('timer-display');
  const text     = document.getElementById('timer-text');
  display.style.display = 'flex';
  display.className     = 'timer-display';
  text.textContent      = state.timeLeft;

  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    text.textContent = state.timeLeft;

    if (state.timeLeft <= 10) display.className = 'timer-display warning';
    if (state.timeLeft <= 5)  display.className = 'timer-display danger';

    if (state.timeLeft <= 0) {
      stopTimer();
      // Auto-submit as wrong
      autoTimeOut();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  document.getElementById('timer-display').className = 'timer-display';
}

function autoTimeOut() {
  if (state.answered) return;
  const q = state.questions[state.current];
  showFeedback(false, q.answer, '⏱️ Time ran out! Move to the next question and try to answer faster.', q);
}

// ============================================
// SUBMIT ANSWER
// ============================================
function submitAnswer() {
  if (state.answered) return;

  const input  = document.getElementById('answer-input');
  const raw    = input.value.trim();
  if (!raw) { input.focus(); return; }

  stopTimer();

  const q           = state.questions[state.current];
  const userAnswer  = raw.toLowerCase().replace(/\s+/g, ' ');
  const correct     = q.answer.toLowerCase().replace(/\s+/g, ' ');

  // Flexible check — also allow partial match for long answers
  const isCorrect = userAnswer === correct
    || correct.includes(userAnswer)
    || userAnswer.includes(correct);

  input.disabled = true;
  document.getElementById('submit-btn').disabled = true;

  const feedback = isCorrect
    ? '✅ Great job! Keep it up!'
    : `The correct answer is: ${q.answer}`;

  showFeedback(isCorrect, q.answer, feedback, q, raw);
}

// ============================================
// SHOW FEEDBACK
// ============================================
function showFeedback(isCorrect, correctAnswer, message, q, userAnswer = '') {
  state.answered = true;

  const box = document.getElementById('feedback-box');
  box.className = `feedback-box show ${isCorrect ? 'correct' : 'wrong'}`;

  document.getElementById('fb-badge').textContent      = isCorrect ? '✅ Correct!' : '❌ Wrong';
  document.getElementById('fb-correct-ans').textContent = isCorrect ? '' : `Correct: ${correctAnswer}`;
  document.getElementById('fb-text').textContent        = message;

  if (isCorrect) {
    state.correctCount++;
    // Award XP
    const xp = addXP('quiz_completed');
    state.xpThisQuiz += 10; // per correct answer
  } else {
    // Save mistake
    saveWrongAnswer(state.subject, q.topic, q.question, userAnswer, correctAnswer);
    state.wrongAnswers.push({ q: q.question, topic: q.topic, wrong: userAnswer, correct: correctAnswer });

    // Show "why wrong" button
    document.getElementById('why-wrong-wrap').classList.add('show');
  }

  // Show next button
  document.getElementById('next-btn-wrap').classList.add('show');
}

// ============================================
// WHY DID I GET THIS WRONG? (AI button)
// ============================================
async function askWhyWrong() {
  const btn     = document.getElementById('why-wrong-btn');
  const expBox  = document.getElementById('ai-explanation');
  const expText = document.getElementById('ai-exp-text');
  const q       = state.questions[state.current];
  const wrong   = state.wrongAnswers[state.wrongAnswers.length - 1];

  btn.disabled    = true;
  btn.textContent = '🤖 Asking AI...';
  expBox.classList.add('show');
  expText.textContent = 'Generating explanation...';

  try {
    // Try backend first
    const data = await apiCall('/api/ai/why-wrong', 'POST', {
      user_id:       getUserId(),
      question:      q.question,
      topic:         q.topic,
      wrong_answer:  wrong ? wrong.wrong : '',
      correct_answer: q.answer,
    });

    if (data && data.explanation) {
      expText.textContent = data.explanation;
    } else {
      // Fallback: local tip
      expText.textContent = getLocalTip(q.topic, q.question, q.answer);
    }
  } catch (e) {
    expText.textContent = getLocalTip(q.topic, q.question, q.answer);
  }

  btn.textContent = '🤔 Why did I get this wrong?';
  btn.disabled    = false;
}

// Local fallback tips when backend not connected
function getLocalTip(topic, question, answer) {
  const tips = {
    'Algebra':        `For algebra, isolate the variable step by step. The answer is ${answer} — try substituting it back to verify.`,
    'Geometry':       `Remember the formulas: Area of circle = πr², Perimeter = 2(l+w). The answer is ${answer}.`,
    'Photosynthesis': `Plants absorb CO₂ and release O₂ during photosynthesis. 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.`,
    'Physics':        `Review the formula. For this question, the answer is ${answer}. Try writing it down!`,
    'Chemistry':      `Check the periodic table for atomic numbers. The answer here is ${answer}.`,
    'Grammar':        `English grammar tip: The correct answer is "${answer}". Practice with similar sentences.`,
  };
  return tips[topic] || `The correct answer is "${answer}". Review your notes on ${topic} and try again! 📖`;
}

// ============================================
// NEXT QUESTION
// ============================================
function nextQuestion() {
  state.current++;
  if (state.current >= state.questions.length) {
    showResult();
  } else {
    loadQuestion();
  }
}

// ============================================
// QUIT QUIZ
// ============================================
function quitQuiz() {
  stopTimer();
  document.getElementById('quiz-active').classList.remove('show');
  document.getElementById('subject-selector').style.display = 'block';
  state.subject = '';
  document.querySelectorAll('.ss-card').forEach(c => c.classList.remove('selected'));
}

// ============================================
// SHOW RESULT
// ============================================
function showResult() {
  stopTimer();

  document.getElementById('quiz-active').classList.remove('show');
  const result = document.getElementById('result-screen');
  result.classList.add('show');

  const total   = state.questions.length;
  const correct = state.correctCount;
  const pct     = Math.round((correct / total) * 100);

  // Emoji & message
  const emoji = pct === 100 ? '🏆' : pct >= 80 ? '🎉' : pct >= 60 ? '📚' : pct >= 40 ? '💪' : '😅';
  const msg   = pct === 100 ? 'Perfect score! Outstanding work! 🌟'
              : pct >= 80   ? 'Excellent! Your mistakes are saved to memory for next time.'
              : pct >= 60   ? 'Good effort! Focus on your weak topics to improve further.'
              : pct >= 40   ? "Keep practising! The AI will help you focus on what you missed."
              : "Don't give up! Your mistakes are saved — the AI will guide your improvement.";

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-score').textContent = `${correct}/${total}`;
  document.getElementById('result-msg').textContent   = msg;

  // XP
  let totalXP = 0;
  totalXP += addXP('quiz_completed');
  if (pct === 100) totalXP += addXP('perfect_score');
  document.getElementById('xp-earned-text').textContent = totalXP + ' XP';

  // Save attempt to history
  addQuizAttempt(state.subject, {
    score:      correct,
    total:      total,
    percentage: pct,
    timeTaken:  0,
  });

  // Improvement badge
  const imp   = getImprovement(state.subject);
  const badge = document.getElementById('improvement-badge');
  if (imp !== null) {
    badge.style.display = 'inline-flex';
    if (imp > 0) {
      badge.className   = 'improvement-badge up';
      badge.textContent = `↑ +${imp}% vs last quiz`;
    } else if (imp < 0) {
      badge.className   = 'improvement-badge down';
      badge.textContent = `↓ ${imp}% vs last quiz`;
    } else {
      badge.className   = 'improvement-badge same';
      badge.textContent = '— Same as last quiz';
    }
  }

  // Check badges
  checkBadges();

  // Wrong answers review
  buildWrongReview();
}

// ============================================
// WRONG ANSWERS REVIEW
// ============================================
function buildWrongReview() {
  const wrap = document.getElementById('wrong-review');
  if (!wrap || state.wrongAnswers.length === 0) return;

  wrap.innerHTML = `
    <div class="wr-title">❌ Questions you got wrong</div>
    ${state.wrongAnswers.map(w => `
      <div class="wr-item">
        <div class="wr-q">${w.q}</div>
        <div class="wr-ans">
          Your answer: <span class="wrong-a">${w.wrong || '(no answer)'}</span> &nbsp;|&nbsp;
          Correct: <span class="correct-a">${w.correct}</span>
        </div>
      </div>
    `).join('')}
  `;
}

// ============================================
// RETAKE QUIZ
// ============================================
function retakeQuiz() {
  document.getElementById('result-screen').classList.remove('show');
  document.getElementById('subject-selector').style.display = 'block';
  state.subject = '';
  buildSubjectGrid();
}

// ============================================
// UTILS
// ============================================
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j   = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}