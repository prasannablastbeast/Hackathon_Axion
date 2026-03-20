/* ============================================
   STUDYMIND AI — onboarding.js
   Handles the 5-step onboarding wizard
   ============================================ */

// Current step (0-indexed)
let currentStep = 0;
const TOTAL_STEPS = 5;

// Collected answers
const answers = {
  name:          '',
  goal:          '',
  studyHours:    '',
  examDate:      '',
  scarySubject:  '',
};

// Default subjects to show in scary subject list
const DEFAULT_SUBJECTS = [
  { name: 'Mathematics',      icon: '📐' },
  { name: 'Science',          icon: '🔬' },
  { name: 'History',          icon: '🏛️' },
  { name: 'English',          icon: '📖' },
  { name: 'Geography',        icon: '🌍' },
  { name: 'Computer Science', icon: '💻' },
];

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // If onboarding already done → go to home
  if (isOnboardingDone()) {
    window.location.href = 'index.html';
    return;
  }

  // Set min date for exam date input to tomorrow
  const tomorrow = addDays(getTodayString(), 1);
  const dateInput = document.getElementById('input-exam-date');
  if (dateInput) dateInput.min = tomorrow;

  // Populate scary subject list
  buildScaryList();

  // Enter key on name input moves to next step
  const nameInput = document.getElementById('input-name');
  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') nextStep();
    });
    nameInput.focus();
  }

  // Render step 0
  renderStep(0);
});

// ============================================
// BUILD SCARY SUBJECT LIST
// ============================================
function buildScaryList() {
  const container = document.getElementById('scary-list');
  if (!container) return;

  container.innerHTML = DEFAULT_SUBJECTS.map(s => `
    <div class="scary-item" data-value="${s.name}" onclick="selectScary(this)">
      <span class="s-icon">${s.icon}</span>
      <span class="s-name">${s.name}</span>
      <span class="s-check">✓</span>
    </div>
  `).join('');
}

// ============================================
// OPTION SELECTORS
// ============================================

// Goal option cards
function selectOption(el, field) {
  const parent = el.closest('.options-grid') || el.parentElement;
  parent.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  answers[field] = el.dataset.value;
}

// Hours cards
function selectHours(el) {
  document.querySelectorAll('.hours-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  answers.studyHours = el.dataset.value;
}

// Scary subject
function selectScary(el) {
  document.querySelectorAll('.scary-item').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  answers.scarySubject = el.dataset.value;
}

// ============================================
// STEP NAVIGATION
// ============================================

function nextStep() {
  // Validate current step
  if (!validateStep(currentStep)) return;

  // Collect data from current step
  collectStep(currentStep);

  if (currentStep < TOTAL_STEPS - 1) {
    currentStep++;
    renderStep(currentStep);
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    renderStep(currentStep);
  }
}

function renderStep(step) {
  // Hide all panels
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));

  // Show current panel
  const panel = document.getElementById(`step-${step}`);
  if (panel) panel.classList.add('active');

  // Update dots
  updateDots(step);

  // If last step — build summary
  if (step === 4) buildSummary();

  // Focus name input on step 0
  if (step === 0) {
    setTimeout(() => {
      const nameInput = document.getElementById('input-name');
      if (nameInput) nameInput.focus();
    }, 50);
  }
}

function updateDots(activeStep) {
  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i < activeStep)      dot.classList.add('done');
    else if (i === activeStep) dot.classList.add('active');
  });
}

// ============================================
// VALIDATION
// ============================================
function validateStep(step) {
  switch (step) {
    case 0: {
      const name = document.getElementById('input-name').value.trim();
      if (!name) {
        shakeInput('input-name');
        showToast('Please enter your name!', 'error');
        return false;
      }
      answers.name = name;
      return true;
    }
    case 1: {
      if (!answers.goal) {
        showToast('Please select your study goal!', 'error');
        return false;
      }
      return true;
    }
    case 2: {
      if (!answers.studyHours) {
        showToast('Please select your daily study hours!', 'error');
        return false;
      }
      return true;
    }
    case 3: {
      // Exam date & scary subject are optional
      const dateInput = document.getElementById('input-exam-date');
      if (dateInput) answers.examDate = dateInput.value || '';
      return true;
    }
    case 4:
      return true;

    default:
      return true;
  }
}

// ============================================
// COLLECT DATA FROM EACH STEP
// ============================================
function collectStep(step) {
  switch (step) {
    case 0:
      answers.name = document.getElementById('input-name').value.trim();
      break;
    case 3: {
      const dateInput = document.getElementById('input-exam-date');
      if (dateInput) answers.examDate = dateInput.value || '';
      break;
    }
  }
}

// ============================================
// BUILD SUMMARY (step 5)
// ============================================
function buildSummary() {
  // Title
  const title = document.getElementById('summary-title');
  if (title) title.textContent = `You're all set, ${answers.name}! 🎉`;

  // Summary grid
  const grid = document.getElementById('summary-grid');
  if (grid) {
    const items = [
      { label: 'Your Name',      val: answers.name         || '—' },
      { label: 'Goal',           val: answers.goal         || '—' },
      { label: 'Daily Hours',    val: answers.studyHours ? `${answers.studyHours}h / day` : '—' },
      { label: 'Exam Date',      val: answers.examDate     ? formatDate(answers.examDate) : 'Not set' },
      { label: 'Scared of',      val: answers.scarySubject || 'None selected' },
      { label: 'Days to Exam',   val: answers.examDate     ? `${getDaysFromToday(answers.examDate)} days` : '—' },
    ];

    grid.innerHTML = items.map(item => `
      <div class="summary-item">
        <div class="s-label">${item.label}</div>
        <div class="s-val">${item.val}</div>
      </div>
    `).join('');
  }

  // Plan preview
  const preview = document.getElementById('plan-preview');
  if (preview) {
    const scary  = answers.scarySubject ? `Focus on <strong>${answers.scarySubject}</strong> first (it's your weak spot). ` : '';
    const days   = answers.examDate ? `${getDaysFromToday(answers.examDate)} days until exam — ` : '';
    const hours  = answers.studyHours ? `${answers.studyHours}h of study per day split across your subjects.` : 'Study at your own pace.';
    const goal   = answers.goal ? `Optimised for <strong>${answers.goal}</strong>. ` : '';

    preview.innerHTML = `${goal}${days}${hours} ${scary}`;
  }
}

// ============================================
// FINISH ONBOARDING
// ============================================
function finishOnboarding() {
  // Save everything to localStorage
  saveData(KEYS.USER_NAME,       answers.name);
  saveData(KEYS.GOAL,            answers.goal);
  saveData(KEYS.STUDY_HOURS,     answers.studyHours);
  saveData(KEYS.EXAM_DATE,       answers.examDate);
  saveData(KEYS.SCARY_SUBJECT,   answers.scarySubject);
  saveData(KEYS.ONBOARDING_DONE, true);

  // Generate user ID
  getUserId();

  // Try to send to backend (non-blocking)
  sendProfileToBackend();

  // Show success toast
  showToast(`Welcome, ${answers.name}! Let's start learning 🚀`, 'success', 2000);

  // Redirect to subjects page
  setTimeout(() => {
    window.location.href = 'subjects.html';
  }, 800);
}

// ============================================
// SEND PROFILE TO BACKEND (optional)
// ============================================
async function sendProfileToBackend() {
  try {
    await apiCall('/api/register', 'POST', {
      user_id:       getUserId(),
      name:          answers.name,
      goal:          answers.goal,
      study_hours:   answers.studyHours,
      scary_subject: answers.scarySubject,
      exam_date:     answers.examDate,
    });
  } catch (e) {
    // Silently fail — all data is already in localStorage
    console.warn('Backend not available, continuing offline.');
  }
}

// ============================================
// HELPERS
// ============================================

// Shake animation on invalid input
function shakeInput(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.style.animation = 'none';
  el.style.borderColor = 'var(--red-500)';
  el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.12)';

  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }, 1500);

  el.focus();
}

// Days from today to a date string
function getDaysFromToday(dateString) {
  if (!dateString) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}