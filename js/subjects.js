/* ============================================
   STUDYMIND AI — subjects.js
   Handles preset + custom subject selection
   ============================================ */

// ---- Preset subjects data ----
const PRESET_SUBJECTS = [
  { name: 'Mathematics',      icon: '📐', desc: 'Algebra, geometry, calculus'    },
  { name: 'Science',          icon: '🔬', desc: 'Physics, chemistry, biology'    },
  { name: 'History',          icon: '🏛️', desc: 'India & world history'          },
  { name: 'English',          icon: '📖', desc: 'Grammar, literature, writing'   },
  { name: 'Geography',        icon: '🌍', desc: 'Maps, climate, resources'       },
  { name: 'Computer Science', icon: '💻', desc: 'Programming, algorithms, data'  },
];

// State
let selectedPresets = [];
let customSubjects  = [];

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  buildNavbar('subjects');

  // Load previously saved subjects if editing
  selectedPresets = loadData(KEYS.SELECTED_SUBJECTS, []);
  customSubjects  = loadData(KEYS.CUSTOM_SUBJECTS, []);

  // Build the preset grid
  buildPresetGrid();

  // Render any existing custom subjects
  customSubjects.forEach(name => renderCustomChip(name));
  updateNoCustomMsg();

  // Render sidebar
  updateSidebar();

  // Enter key on custom input
  const customInput = document.getElementById('custom-input');
  if (customInput) {
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addCustomSubject();
    });
  }
});

// ============================================
// BUILD PRESET GRID
// ============================================
function buildPresetGrid() {
  const grid = document.getElementById('preset-grid');
  if (!grid) return;

  grid.innerHTML = PRESET_SUBJECTS.map(s => `
    <div
      class="subj-card ${selectedPresets.includes(s.name) ? 'selected' : ''}"
      data-name="${s.name}"
      onclick="togglePreset(this, '${s.name}')"
    >
      <span class="tick">✓</span>
      <span class="subj-icon">${s.icon}</span>
      <span class="subj-name">${s.name}</span>
      <span class="subj-desc">${s.desc}</span>
    </div>
  `).join('');
}

// ============================================
// TOGGLE PRESET SUBJECT
// ============================================
function togglePreset(el, name) {
  if (selectedPresets.includes(name)) {
    // Deselect
    selectedPresets = selectedPresets.filter(s => s !== name);
    el.classList.remove('selected');
  } else {
    // Select
    selectedPresets.push(name);
    el.classList.add('selected');
  }
  updateSidebar();
  hideWarning();
}

// ============================================
// CUSTOM SUBJECTS
// ============================================
function addCustomSubject() {
  const input = document.getElementById('custom-input');
  const name  = input.value.trim();

  if (!name) {
    input.focus();
    return;
  }

  // Check for duplicates (case insensitive)
  const allNames = [
    ...PRESET_SUBJECTS.map(s => s.name.toLowerCase()),
    ...selectedPresets.map(s => s.toLowerCase()),
    ...customSubjects.map(s => s.toLowerCase()),
  ];
  if (allNames.includes(name.toLowerCase())) {
    showToast(`"${name}" is already in your list!`, 'warning');
    input.value = '';
    input.focus();
    return;
  }

  // Max 6 custom subjects
  if (customSubjects.length >= 6) {
    showToast('Maximum 6 custom subjects allowed!', 'error');
    return;
  }

  customSubjects.push(name);
  renderCustomChip(name);
  updateNoCustomMsg();
  updateSidebar();

  input.value = '';
  input.focus();
}

function renderCustomChip(name) {
  const container = document.getElementById('custom-chips');
  const noMsg     = document.getElementById('no-custom-msg');
  if (noMsg) noMsg.style.display = 'none';

  const chip = document.createElement('div');
  chip.className    = 'custom-chip';
  chip.dataset.name = name;
  chip.innerHTML = `
    <span>${getSubjectIcon(name)} ${name}</span>
    <button class="chip-remove" onclick="removeCustomSubject('${name}', this)" title="Remove">✕</button>
  `;
  container.appendChild(chip);
}

function removeCustomSubject(name, btn) {
  customSubjects = customSubjects.filter(s => s !== name);
  btn.closest('.custom-chip').remove();
  updateNoCustomMsg();
  updateSidebar();
}

function updateNoCustomMsg() {
  const msg = document.getElementById('no-custom-msg');
  if (!msg) return;
  msg.style.display = customSubjects.length === 0 ? 'block' : 'none';
}

// ============================================
// SIDEBAR — selected subjects summary
// ============================================
function updateSidebar() {
  const allSelected = getAllSelected();
  const list        = document.getElementById('selected-list');
  const count       = document.getElementById('sel-count');

  if (count) {
    count.textContent = `${allSelected.length} selected`;
  }

  if (!list) return;

  if (allSelected.length === 0) {
    list.innerHTML = `
      <div class="empty-selection">
        <div class="es-icon">📚</div>
        Select at least 1 subject to continue
      </div>
    `;
    return;
  }

  list.innerHTML = allSelected.map(name => `
    <div class="selected-row" data-name="${name}">
      <span class="sr-icon">${getSubjectIcon(name)}</span>
      <span class="sr-name">${name}</span>
      <button class="sr-remove" onclick="removeFromSidebar('${name}')">✕</button>
    </div>
  `).join('');
}

function removeFromSidebar(name) {
  // Check if it's a preset or custom
  if (PRESET_SUBJECTS.find(s => s.name === name)) {
    // Deselect preset card
    selectedPresets = selectedPresets.filter(s => s !== name);
    const card = document.querySelector(`.subj-card[data-name="${name}"]`);
    if (card) card.classList.remove('selected');
  } else {
    // Remove custom
    customSubjects = customSubjects.filter(s => s !== name);
    const chip = document.querySelector(`.custom-chip[data-name="${name}"]`);
    if (chip) chip.remove();
    updateNoCustomMsg();
  }
  updateSidebar();
}

function getAllSelected() {
  return [...selectedPresets, ...customSubjects];
}

// ============================================
// SAVE & CONTINUE
// ============================================
function saveSubjects() {
  const all = getAllSelected();

  if (all.length === 0) {
    showWarning();
    showToast('Please select at least 1 subject!', 'error');
    return;
  }

  // Save to localStorage
  saveData(KEYS.SELECTED_SUBJECTS, selectedPresets);
  saveData(KEYS.CUSTOM_SUBJECTS,   customSubjects);

  // Try to sync with backend (non-blocking)
  syncWithBackend(all);

  showToast(`${all.length} subject${all.length > 1 ? 's' : ''} saved! 🎉`, 'success');

  // Redirect to home
  setTimeout(() => {
    // If coming from onboarding → go to index
    // If editing → go back to wherever they came from
    const from = new URLSearchParams(window.location.search).get('from');
    window.location.href = from === 'nav' ? 'index.html' : 'index.html';
  }, 600);
}

// ============================================
// BACKEND SYNC (non-blocking)
// ============================================
async function syncWithBackend(subjects) {
  try {
    await apiCall('/api/subjects/save', 'POST', {
      user_id:         getUserId(),
      subjects:        selectedPresets,
      custom_subjects: customSubjects,
    });
  } catch (e) {
    console.warn('Backend sync failed, data saved locally.');
  }
}

// ============================================
// WARNING HELPERS
// ============================================
function showWarning() {
  const w = document.getElementById('min-warning');
  if (w) w.classList.add('show');
}
function hideWarning() {
  const w = document.getElementById('min-warning');
  if (w) w.classList.remove('show');
}