/* ============================================
   STUDYMIND AI — main.js
   Shared across ALL pages
   Handles: localStorage, navbar, streak,
            XP, dark mode, utility functions
   ============================================ */

// ============================================
// 1. LOCALSTORAGE KEYS — single source of truth
//    Both frontend & backend use these exact names
// ============================================
const KEYS = {
  USER_ID:          'sm_user_id',
  USER_NAME:        'sm_user_name',
  GOAL:             'sm_goal',
  STUDY_HOURS:      'sm_study_hours',
  SCARY_SUBJECT:    'sm_scary_subject',
  EXAM_DATE:        'sm_exam_date',
  ONBOARDING_DONE:  'sm_onboarding_done',

  SELECTED_SUBJECTS:'sm_selected_subjects',
  CUSTOM_SUBJECTS:  'sm_custom_subjects',

  QUIZ_HISTORY:     'sm_quiz_history',
  WEAK_TOPICS:      'sm_weak_topics',
  WRONG_ANSWERS:    'sm_wrong_answers',

  SPACED_REPETITION:'sm_spaced_repetition',

  XP:               'sm_xp',
  LEVEL:            'sm_level',
  BADGES:           'sm_badges',

  STREAK:           'sm_streak',
  LAST_LOGIN:       'sm_last_login',
  STREAK_FREEZES:   'sm_streak_freezes',

  GOALS:            'sm_goals',
  NOTES:            'sm_notes',

  THEME:            'sm_theme',
  TIMER_MODE:       'sm_timer_mode',
};

// ============================================
// 2. LOCALSTORAGE HELPERS
// ============================================

// Save any value (auto JSON stringifies objects/arrays)
function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('SaveData error:', e);
  }
}

// Load any value (auto parses JSON)
function loadData(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (e) {
    return defaultValue;
  }
}

// Remove a key
function removeData(key) {
  localStorage.removeItem(key);
}

// Clear ALL StudyMind data (reset app)
function clearAllData() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}

// ============================================
// 3. USER HELPERS
// ============================================

function getUserId() {
  let id = loadData(KEYS.USER_ID);
  if (!id) {
    // Generate a simple unique ID
    id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    saveData(KEYS.USER_ID, id);
  }
  return id;
}

function getUserName() {
  return loadData(KEYS.USER_NAME, 'Student');
}

function isOnboardingDone() {
  return loadData(KEYS.ONBOARDING_DONE, false);
}

function getSelectedSubjects() {
  const preset = loadData(KEYS.SELECTED_SUBJECTS, []);
  const custom = loadData(KEYS.CUSTOM_SUBJECTS, []);
  return [...preset, ...custom];
}

function getExamDate() {
  return loadData(KEYS.EXAM_DATE, null);
}

// Days remaining until exam
function getDaysUntilExam() {
  const examDate = getExamDate();
  if (!examDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam  = new Date(examDate);
  exam.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

// ============================================
// 4. QUIZ HISTORY HELPERS
// ============================================

// Add a quiz attempt for a subject
// attempt = { date, score, total, percentage, timeTaken }
function addQuizAttempt(subject, attempt) {
  const history = loadData(KEYS.QUIZ_HISTORY, {});
  if (!history[subject]) history[subject] = [];
  history[subject].push({
    ...attempt,
    date: attempt.date || getTodayString(),
  });
  saveData(KEYS.QUIZ_HISTORY, history);
}

// Get all attempts for a subject
function getQuizHistory(subject) {
  const history = loadData(KEYS.QUIZ_HISTORY, {});
  return history[subject] || [];
}

// Get latest attempt for a subject
function getLatestAttempt(subject) {
  const history = getQuizHistory(subject);
  return history.length > 0 ? history[history.length - 1] : null;
}

// Get previous attempt (second to last)
function getPreviousAttempt(subject) {
  const history = getQuizHistory(subject);
  return history.length > 1 ? history[history.length - 2] : null;
}

// Calculate improvement % vs last quiz
function getImprovement(subject) {
  const latest   = getLatestAttempt(subject);
  const previous = getPreviousAttempt(subject);
  if (!latest || !previous) return null;
  return Math.round(latest.percentage - previous.percentage);
}

// Get trend: 'improving' | 'declining' | 'stable' | 'new'
function getTrend(subject) {
  const improvement = getImprovement(subject);
  if (improvement === null) return 'new';
  if (improvement > 5)  return 'improving';
  if (improvement < -5) return 'declining';
  return 'stable';
}

// Get overall accuracy for a subject
function getOverallAccuracy(subject) {
  const history = getQuizHistory(subject);
  if (history.length === 0) return 0;
  const total = history.reduce((sum, h) => sum + h.percentage, 0);
  return Math.round(total / history.length);
}

// Get best score for a subject
function getBestScore(subject) {
  const history = getQuizHistory(subject);
  if (history.length === 0) return 0;
  return Math.max(...history.map(h => h.percentage));
}

// ============================================
// 5. WEAK TOPICS HELPERS
// ============================================

// Save a wrong answer
function saveWrongAnswer(subject, topic, question, wrongAnswer, correctAnswer) {
  // Save to weak topics
  const weak = loadData(KEYS.WEAK_TOPICS, {});
  if (!weak[subject]) weak[subject] = [];
  if (!weak[subject].includes(topic)) {
    weak[subject].push(topic);
  }
  saveData(KEYS.WEAK_TOPICS, weak);

  // Save to wrong answers log
  const log = loadData(KEYS.WRONG_ANSWERS, []);
  log.push({
    subject,
    topic,
    question,
    wrongAnswer,
    correctAnswer,
    date: getTodayString(),
  });
  saveData(KEYS.WRONG_ANSWERS, log);

  // Update spaced repetition
  updateSpacedRepetition(subject, topic);
}

// Get weak topics for a subject
function getWeakTopics(subject) {
  const weak = loadData(KEYS.WEAK_TOPICS, {});
  return weak[subject] || [];
}

// Get all weak topics across all subjects
function getAllWeakTopics() {
  return loadData(KEYS.WEAK_TOPICS, {});
}

// Count mistakes for a topic
function getMistakeCount(subject, topic) {
  const log = loadData(KEYS.WRONG_ANSWERS, []);
  return log.filter(w => w.subject === subject && w.topic === topic).length;
}

// ============================================
// 6. SPACED REPETITION HELPERS
// ============================================

const SPACED_INTERVALS = [1, 3, 7, 14, 30]; // days

function updateSpacedRepetition(subject, topic) {
  const spaced = loadData(KEYS.SPACED_REPETITION, {});
  const key    = `${subject}__${topic}`;

  if (!spaced[key]) {
    spaced[key] = {
      subject,
      topic,
      timesWrong:    1,
      intervalIndex: 0,
      lastWrong:     getTodayString(),
      nextRevision:  addDays(getTodayString(), SPACED_INTERVALS[0]),
    };
  } else {
    spaced[key].timesWrong++;
    spaced[key].lastWrong    = getTodayString();
    spaced[key].intervalIndex = 0; // reset interval on new mistake
    spaced[key].nextRevision  = addDays(getTodayString(), SPACED_INTERVALS[0]);
  }

  saveData(KEYS.SPACED_REPETITION, spaced);
}

// Mark a topic as revised → move to next interval
function markTopicRevised(subject, topic) {
  const spaced = loadData(KEYS.SPACED_REPETITION, {});
  const key    = `${subject}__${topic}`;

  if (spaced[key]) {
    const nextIndex = Math.min(
      spaced[key].intervalIndex + 1,
      SPACED_INTERVALS.length - 1
    );
    spaced[key].intervalIndex = nextIndex;
    spaced[key].nextRevision  = addDays(getTodayString(), SPACED_INTERVALS[nextIndex]);
    saveData(KEYS.SPACED_REPETITION, spaced);
    return SPACED_INTERVALS[nextIndex];
  }
  return null;
}

// Get topics due for revision today
function getDueTopics() {
  const spaced = loadData(KEYS.SPACED_REPETITION, {});
  const today  = getTodayString();

  return Object.values(spaced)
    .filter(item => item.nextRevision <= today)
    .sort((a, b) => a.nextRevision.localeCompare(b.nextRevision));
}

// ============================================
// 7. XP & GAMIFICATION HELPERS
// ============================================

const XP_VALUES = {
  quiz_completed:  50,
  perfect_score:  100,
  daily_streak:    25,
  wrong_revised:   15,
  goal_completed:  20,
  first_quiz:      30,
};

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0,    title: 'Beginner' },
  { level: 2, xp: 200,  title: 'Explorer' },
  { level: 3, xp: 500,  title: 'Learner'  },
  { level: 4, xp: 900,  title: 'Scholar'  },
  { level: 5, xp: 1400, title: 'Expert'   },
  { level: 6, xp: 2000, title: 'Master'   },
];

function addXP(reason) {
  const amount = XP_VALUES[reason] || 0;
  if (!amount) return 0;

  const current = loadData(KEYS.XP, 0);
  const newXP   = current + amount;
  saveData(KEYS.XP, newXP);

  // Show XP pop animation
  showXPPop(`+${amount} XP`);

  // Check level up
  checkLevelUp(current, newXP);

  return amount;
}

function getXP() { return loadData(KEYS.XP, 0); }

function getLevelInfo() {
  const xp = getXP();
  let current = LEVEL_THRESHOLDS[0];
  let next    = LEVEL_THRESHOLDS[1];

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) {
      current = LEVEL_THRESHOLDS[i];
      next    = LEVEL_THRESHOLDS[i + 1] || null;
    }
  }

  const xpInLevel  = xp - current.xp;
  const xpForNext  = next ? next.xp - current.xp : 1;
  const percentage = next ? Math.round((xpInLevel / xpForNext) * 100) : 100;

  return { ...current, xp, next, percentage };
}

function checkLevelUp(oldXP, newXP) {
  const oldLevel = LEVEL_THRESHOLDS.filter(l => oldXP >= l.xp).pop();
  const newLevel = LEVEL_THRESHOLDS.filter(l => newXP >= l.xp).pop();
  if (newLevel && oldLevel && newLevel.level > oldLevel.level) {
    showToast(`🎉 Level Up! You are now ${newLevel.title}`, 'success');
  }
}

// ============================================
// 8. BADGE HELPERS
// ============================================

const ALL_BADGES = [
  { id: 'first_quiz',    name: 'First Quiz',     icon: '🎯', desc: 'Complete your first quiz' },
  { id: 'streak_3',      name: '3-Day Streak',   icon: '🔥', desc: 'Study 3 days in a row' },
  { id: 'streak_7',      name: 'Week Warrior',   icon: '⚡', desc: 'Study 7 days in a row' },
  { id: 'perfect_score', name: 'Perfect Score',  icon: '💯', desc: 'Get 100% on any quiz' },
  { id: 'improved_20',   name: 'Big Jump',       icon: '📈', desc: 'Improve by 20% in one go' },
  { id: 'quiz_10',       name: '10 Quizzes',     icon: '🏆', desc: 'Complete 10 quizzes' },
  { id: 'all_subjects',  name: 'All Rounder',    icon: '🌟', desc: 'Quiz on all your subjects' },
];

function getEarnedBadges() {
  return loadData(KEYS.BADGES, []);
}

function earnBadge(badgeId) {
  const earned = getEarnedBadges();
  if (earned.includes(badgeId)) return false; // already earned

  earned.push(badgeId);
  saveData(KEYS.BADGES, earned);

  const badge = ALL_BADGES.find(b => b.id === badgeId);
  if (badge) {
    showToast(`${badge.icon} Badge Unlocked: ${badge.name}!`, 'success');
  }
  return true;
}

function checkBadges() {
  const history = loadData(KEYS.QUIZ_HISTORY, {});
  const totalQuizzes = Object.values(history).reduce((s, arr) => s + arr.length, 0);

  if (totalQuizzes >= 1)  earnBadge('first_quiz');
  if (totalQuizzes >= 10) earnBadge('quiz_10');

  // Perfect score check
  const allAttempts = Object.values(history).flat();
  if (allAttempts.some(a => a.percentage === 100)) earnBadge('perfect_score');

  // Improvement check
  const subjects = getSelectedSubjects();
  subjects.forEach(s => {
    const imp = getImprovement(s);
    if (imp !== null && imp >= 20) earnBadge('improved_20');
  });

  // All subjects quizzed
  const quizzedSubjects = Object.keys(history);
  if (subjects.length > 0 && subjects.every(s => quizzedSubjects.includes(s))) {
    earnBadge('all_subjects');
  }

  // Streak badges
  const streak = getStreak();
  if (streak >= 3) earnBadge('streak_3');
  if (streak >= 7) earnBadge('streak_7');
}

// ============================================
// 9. STREAK HELPERS
// ============================================

function getStreak() { return loadData(KEYS.STREAK, 0); }
function getStreakFreezes() { return loadData(KEYS.STREAK_FREEZES, 1); }

function updateStreak() {
  const today     = getTodayString();
  const lastLogin = loadData(KEYS.LAST_LOGIN, null);

  if (lastLogin === today) return getStreak(); // already updated today

  const yesterday = addDays(today, -1);
  let streak      = getStreak();
  let freezes     = getStreakFreezes();

  if (lastLogin === yesterday) {
    // Consecutive day — increment
    streak++;
    showToast(`🔥 ${streak} day streak! Keep going!`, 'info');
  } else if (lastLogin && freezes > 0) {
    // Missed a day but has freeze
    freezes--;
    saveData(KEYS.STREAK_FREEZES, freezes);
    showToast('🧊 Streak freeze used! Keep studying!', 'warning');
  } else if (lastLogin) {
    // Missed — reset streak
    streak = 1;
  } else {
    // First time
    streak = 1;
  }

  saveData(KEYS.STREAK, streak);
  saveData(KEYS.LAST_LOGIN, today);

  // Award XP for streak
  addXP('daily_streak');

  // Check streak badges
  if (streak >= 3) earnBadge('streak_3');
  if (streak >= 7) earnBadge('streak_7');

  return streak;
}

// ============================================
// 10. GOALS HELPERS
// ============================================

function getTodayGoals() {
  const allGoals = loadData(KEYS.GOALS, {});
  return allGoals[getTodayString()] || [];
}

function saveGoal(text) {
  const allGoals = loadData(KEYS.GOALS, {});
  const today    = getTodayString();
  if (!allGoals[today]) allGoals[today] = [];
  allGoals[today].push({ text, done: false, id: Date.now() });
  saveData(KEYS.GOALS, allGoals);
}

function toggleGoal(goalId) {
  const allGoals = loadData(KEYS.GOALS, {});
  const today    = getTodayString();
  if (!allGoals[today]) return;

  const goal = allGoals[today].find(g => g.id === goalId);
  if (goal) {
    goal.done = !goal.done;
    if (goal.done) addXP('goal_completed');
    saveData(KEYS.GOALS, allGoals);
  }
}

// ============================================
// 11. NOTES HELPERS
// ============================================

function saveNote(subject, topic, note) {
  const notes = loadData(KEYS.NOTES, {});
  const key   = `${subject}__${topic}`;
  notes[key]  = { subject, topic, note, updated: getTodayString() };
  saveData(KEYS.NOTES, notes);
}

function getNote(subject, topic) {
  const notes = loadData(KEYS.NOTES, {});
  const key   = `${subject}__${topic}`;
  return notes[key] ? notes[key].note : '';
}

function getNotesBySubject(subject) {
  const notes = loadData(KEYS.NOTES, {});
  return Object.values(notes).filter(n => n.subject === subject);
}

// ============================================
// 12. DATE HELPERS
// ============================================

function getTodayString() {
  return new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function formatDateShort(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short'
  });
}

function getRelativeDate(dateString) {
  const today    = new Date(getTodayString());
  const date     = new Date(dateString);
  const diffDays = Math.round((today - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)   return `${diffDays} days ago`;
  return formatDateShort(dateString);
}

// ============================================
// 13. UI HELPERS
// ============================================

// Toast notification
function showToast(message, type = 'info', duration = 3000) {
  // Remove existing toast
  const existing = document.getElementById('sm-toast');
  if (existing) existing.remove();

  const icons = {
    success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.id = 'sm-toast';
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--gray-900); color: var(--text-inverse);
    padding: 12px 20px; border-radius: 10px;
    font-size: 14px; font-family: var(--font);
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 9999; animation: fadeUp 0.3s ease;
    white-space: nowrap; max-width: 90vw;
  `;

  if (type === 'success') toast.style.background = 'var(--green-600)';
  if (type === 'error')   toast.style.background = 'var(--red-600)';
  if (type === 'warning') toast.style.background = 'var(--amber-600)';

  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// XP pop animation
function showXPPop(text) {
  const pop = document.createElement('div');
  pop.className = 'xp-pop';
  pop.textContent = text;
  pop.style.cssText = `
    position: fixed;
    bottom: 70px; left: 50%;
    transform: translateX(-50%);
    font-size: 14px; font-weight: 600;
    color: var(--accent);
    pointer-events: none; z-index: 9999;
    animation: xpPop 1.2s ease forwards;
    font-family: var(--font);
  `;
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 1200);
}

// Circular progress SVG helper
function buildCircle(percentage, size = 100, strokeWidth = 8, colorClass = '') {
  const radius      = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset      = circumference - (percentage / 100) * circumference;
  const center      = size / 2;

  const color = colorClass === 'green' ? 'var(--green-500)'
              : colorClass === 'red'   ? 'var(--red-500)'
              : colorClass === 'amber' ? 'var(--amber-500)'
              : 'var(--accent)';

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle
        cx="${center}" cy="${center}" r="${radius}"
        fill="none" stroke="var(--gray-100)" stroke-width="${strokeWidth}"
      />
      <circle
        cx="${center}" cy="${center}" r="${radius}"
        fill="none" stroke="${color}" stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        transform="rotate(-90 ${center} ${center})"
        style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)"
      />
    </svg>
  `;
}

// Trend badge HTML
function trendBadge(trend) {
  if (trend === 'improving') return '<span class="trend-up">↑ Improving</span>';
  if (trend === 'declining') return '<span class="trend-down">↓ Needs work</span>';
  if (trend === 'stable')    return '<span class="trend-flat">— Stable</span>';
  return '<span class="trend-flat">— First attempt</span>';
}

// Subject icon map
const SUBJECT_ICONS = {
  'Mathematics':       '📐',
  'Science':           '🔬',
  'History':           '🏛️',
  'English':           '📖',
  'Geography':         '🌍',
  'Computer Science':  '💻',
};

function getSubjectIcon(subject) {
  return SUBJECT_ICONS[subject] || '📚';
}

// ============================================
// 14. NAVBAR — builds it on every page
// ============================================

function buildNavbar(activePage = '') {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  const name   = getUserName();
  const streak = getStreak();
  const xp     = getXP();
  const theme  = loadData(KEYS.THEME, 'light');

  // Apply saved theme
  if (theme === 'dark') document.body.classList.add('dark');

  const pages = [
    { id: 'index',       label: 'Home',        icon: '🏠', href: 'index.html' },
    { id: 'quiz',        label: 'Quiz',         icon: '📝', href: 'quiz.html' },
    { id: 'dashboard',   label: 'Dashboard',    icon: '📊', href: 'dashboard.html' },
    { id: 'study-plan',  label: 'Study Plan',   icon: '📅', href: 'study-plan.html' },
    { id: 'weak-topics', label: 'Weak Topics',  icon: '⚠️', href: 'weak-topics.html' },
    { id: 'report',      label: 'Report',       icon: '📋', href: 'report.html' },
    { id: 'subjects',    label: 'My Subjects',  icon: '⚙️', href: 'subjects.html' },
  ];

  const links = pages.map(p => `
    <a href="${p.href}"
       class="nav-link ${activePage === p.id ? 'active' : ''}"
       title="${p.label}">
      <span class="nav-icon">${p.icon}</span>
      ${p.label}
    </a>
  `).join('');

  nav.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="nav-logo" style="text-decoration:none">
        <span class="logo-dot"></span>
        StudyMind
      </a>

      <div class="nav-links">
        ${links}
      </div>

      <div class="nav-right">
        <!-- Streak badge -->
        <div style="
          display:flex; align-items:center; gap:5px;
          padding: 5px 10px;
          background: var(--amber-50);
          border: 1px solid var(--amber-100);
          border-radius: var(--radius-full);
          font-size: 12px;
          color: var(--amber-700);
          font-weight: 500;
        ">
          🔥 <span id="nav-streak">${streak}</span>
        </div>

        <!-- XP badge -->
        <div style="
          display:flex; align-items:center; gap:5px;
          padding: 5px 10px;
          background: var(--blue-50);
          border: 1px solid var(--blue-100);
          border-radius: var(--radius-full);
          font-size: 12px;
          color: var(--blue-700);
          font-weight: 500;
        ">
          ⚡ <span id="nav-xp">${xp}</span> XP
        </div>

        <!-- Dark mode toggle -->
        <button class="theme-toggle" onclick="toggleTheme()" title="Toggle dark mode">
          <span id="theme-icon">${theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
      </div>
    </div>
  `;
}

// ============================================
// 15. DARK MODE TOGGLE
// ============================================

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  saveData(KEYS.THEME, isDark ? 'dark' : 'light');
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
}

// ============================================
// 16. REDIRECT GUARDS
// ============================================

// Call on every page — redirects if not set up
function requireOnboarding() {
  if (!isOnboardingDone()) {
    window.location.href = 'onboarding.html';
    return false;
  }
  return true;
}

// Call on quiz/dashboard pages
function requireSubjects() {
  const subjects = getSelectedSubjects();
  if (subjects.length === 0) {
    window.location.href = 'subjects.html';
    return false;
  }
  return true;
}

// ============================================
// 17. BACKEND API HELPER
//     Your backend teammate just changes BASE_URL
// ============================================

const BASE_URL = 'http://localhost:5000';

async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (e) {
    console.warn('API call failed (using local data):', e.message);
    return null; // graceful fallback to localStorage
  }
}

// ============================================
// 18. PAGE INIT — runs on every page load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme immediately (prevents flash)
  const theme = loadData(KEYS.THEME, 'light');
  if (theme === 'dark') document.body.classList.add('dark');

  // Update streak on every page load
  updateStreak();

  // Check & award badges
  checkBadges();
});