/* ============================================
   STUDYMIND AI — dashboard.js
   Powers: dashboard.html, study-plan.html,
           weak-topics.html
   ============================================ */

let compareOpen = false;

// ============================================
// INIT — dashboard.html
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  if (!isOnboardingDone()) { window.location.href = 'onboarding.html'; return; }

  buildNavbar('dashboard');
  renderStats();
  renderPerformance();
  renderWeakChips();
  buildHistorySelect();
  renderMiniChart();
  renderRecentActivity();
  buildCompareRows();
  loadStudyPlan();
});

// ============================================
// 1. STAT CARDS
// ============================================
function renderStats() {
  const history  = loadData(KEYS.QUIZ_HISTORY, {});
  const attempts = Object.values(history).flat();
  const total    = attempts.reduce((s, a) => s + a.total, 0);
  const correct  = attempts.reduce((s, a) => s + a.score, 0);
  const mistakes = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  setEl('stat-total',    total);
  setEl('stat-correct',  correct);
  setEl('stat-mistakes', mistakes);
  setEl('stat-accuracy', accuracy + '%');

  // Changes (compare last 5 vs previous 5 attempts)
  if (attempts.length >= 2) {
    const recent = attempts.slice(-5);
    const prev   = attempts.slice(-10, -5);
    if (prev.length > 0) {
      const recentAcc = Math.round(recent.reduce((s,a) => s + a.percentage, 0) / recent.length);
      const prevAcc   = Math.round(prev.reduce((s,a)   => s + a.percentage, 0) / prev.length);
      const delta     = recentAcc - prevAcc;
      const changeEl  = document.getElementById('stat-accuracy-change');
      if (changeEl) {
        changeEl.textContent = delta >= 0 ? `↑ +${delta}% vs last session` : `↓ ${delta}% vs last session`;
        changeEl.style.color = delta >= 0 ? 'var(--green-600)' : 'var(--red-600)';
      }
    }
  }
}

// ============================================
// 2. PERFORMANCE BARS
// ============================================
function renderPerformance() {
  const subjects = getSelectedSubjects();
  const list     = document.getElementById('perf-list');
  if (!list) return;

  if (subjects.length === 0) {
    list.innerHTML = '<p class="no-data">No subjects selected.</p>';
    return;
  }

  const hasData = subjects.some(s => getQuizHistory(s).length > 0);
  if (!hasData) {
    list.innerHTML = '<p class="no-data">Take a quiz to see your performance here!</p>';
    return;
  }

  list.innerHTML = subjects.map(s => {
    const acc  = getOverallAccuracy(s);
    const tr   = getTrend(s);
    const imp  = getImprovement(s);
    const icon = getSubjectIcon(s);

    const trendLabel = tr === 'improving' ? `↑ +${imp}%`
                     : tr === 'declining' ? `↓ ${imp}%`
                     : tr === 'new'       ? 'New'
                     : '— Stable';
    const trendClass = tr === 'improving' ? 'up'
                     : tr === 'declining' ? 'down'
                     : tr === 'new'       ? 'new'
                     : 'flat';

    // Bar color based on score
    const barClass = acc >= 75 ? 'green' : acc >= 50 ? '' : acc >= 25 ? 'amber' : 'red';

    return `
      <div class="perf-item">
        <div class="perf-top">
          <div class="perf-left">
            <span class="perf-icon">${icon}</span>
            <span class="perf-name">${s}</span>
          </div>
          <div class="perf-right">
            <span class="perf-pct">${acc}%</span>
            <span class="trend-badge ${trendClass}">${trendLabel}</span>
          </div>
        </div>
        <div class="perf-bar-wrap">
          <div class="perf-bar-fill ${barClass}" style="width:${acc}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// 3. WEAK TOPICS CHIPS
// ============================================
function renderWeakChips() {
  const allWeak  = getAllWeakTopics();
  const subjects = getSelectedSubjects();
  const container = document.getElementById('weak-chips');
  if (!container) return;

  const chips = [];
  subjects.forEach(s => {
    const topics = allWeak[s] || [];
    topics.forEach(t => chips.push({ subject: s, topic: t }));
  });

  if (chips.length === 0) {
    container.innerHTML = '<p class="no-data">No weak topics yet — great work!</p>';
    return;
  }

  container.innerHTML = chips.map(c => `
    <span class="weak-chip">
      ${getSubjectIcon(c.subject)} ${c.topic}
    </span>
  `).join('');
}

// ============================================
// 4. HISTORY SELECT + MINI CHART
// ============================================
function buildHistorySelect() {
  const subjects = getSelectedSubjects();
  const sel      = document.getElementById('history-subject-select');
  if (!sel) return;

  sel.innerHTML = subjects.map(s =>
    `<option value="${s}">${getSubjectIcon(s)} ${s}</option>`
  ).join('');
}

function renderMiniChart() {
  const sel     = document.getElementById('history-subject-select');
  const subject = sel ? sel.value : getSelectedSubjects()[0];
  const chart   = document.getElementById('mini-chart');
  if (!chart || !subject) return;

  const history = getQuizHistory(subject);

  if (history.length === 0) {
    chart.innerHTML = '<p class="no-data" style="align-self:center;padding:var(--space-4)">No quiz history yet for this subject!</p>';
    return;
  }

  // Show last 6 attempts
  const recent = history.slice(-6);
  const maxPct = 100;

  chart.innerHTML = recent.map((attempt, i) => {
    const h      = Math.max(4, Math.round((attempt.percentage / maxPct) * 64));
    const label  = formatDateShort(attempt.date);
    const color  = attempt.percentage >= 75 ? 'var(--green-500)'
                 : attempt.percentage >= 50 ? 'var(--accent)'
                 : 'var(--red-500)';
    return `
      <div class="mc-bar-wrap">
        <div class="mc-val">${attempt.percentage}%</div>
        <div class="mc-bar" style="height:${h}px;background:${color}" title="${attempt.percentage}% on ${label}"></div>
        <div class="mc-label">${label}</div>
      </div>
    `;
  }).join('');
}

// ============================================
// 5. RECENT ACTIVITY
// ============================================
function renderRecentActivity() {
  const history  = loadData(KEYS.QUIZ_HISTORY, {});
  const list     = document.getElementById('activity-list');
  if (!list) return;

  // Flatten all attempts with subject
  const all = [];
  Object.entries(history).forEach(([subject, attempts]) => {
    attempts.forEach(a => all.push({ ...a, subject }));
  });

  // Sort newest first
  all.sort((a, b) => b.date.localeCompare(a.date));
  const recent = all.slice(0, 6);

  if (recent.length === 0) {
    list.innerHTML = '<p class="no-data">No activity yet. Start with a quiz!</p>';
    return;
  }

  list.innerHTML = recent.map(a => {
    const scoreClass = a.percentage >= 75 ? 'high' : a.percentage >= 50 ? 'medium' : 'low';
    const icon       = getSubjectIcon(a.subject);
    return `
      <div class="activity-item">
        <span class="act-icon">${icon}</span>
        <div class="act-body">
          <div class="act-title">${a.subject} Quiz</div>
          <div class="act-sub">${getRelativeDate(a.date)} · ${a.score}/${a.total} correct</div>
        </div>
        <span class="act-score ${scoreClass}">${a.percentage}%</span>
      </div>
    `;
  }).join('');
}

// ============================================
// 6. COMPARE MODE
// ============================================
function toggleCompare() {
  compareOpen = !compareOpen;
  const panel  = document.getElementById('compare-panel');
  const toggle = document.getElementById('compare-toggle');
  if (panel)  panel.classList.toggle('show', compareOpen);
  if (toggle) {
    toggle.classList.toggle('active', compareOpen);
    toggle.textContent = compareOpen ? 'Hide Compare' : 'Show Compare';
  }
}

function buildCompareRows() {
  const subjects = getSelectedSubjects();
  const wrap     = document.getElementById('compare-rows');
  if (!wrap) return;

  wrap.innerHTML = subjects.map(s => {
    const latest   = getLatestAttempt(s);
    const previous = getPreviousAttempt(s);
    const latestPct  = latest   ? latest.percentage   : null;
    const previousPct = previous ? previous.percentage : null;
    const delta       = latestPct !== null && previousPct !== null
                        ? latestPct - previousPct : null;

    const barWidth    = latestPct || 0;
    const deltaLabel  = delta === null ? '—'
                      : delta > 0 ? `+${delta}%`
                      : delta < 0 ? `${delta}%`
                      : '0%';
    const deltaClass  = delta === null ? 'flat'
                      : delta > 0 ? 'up'
                      : delta < 0 ? 'down' : 'flat';

    return `
      <div class="compare-row">
        <span class="compare-subj">${getSubjectIcon(s)} ${s}</span>
        <div class="compare-bar-wrap">
          <div class="compare-bar-fill" style="width:${barWidth}%"></div>
        </div>
        <span class="compare-val">${previousPct !== null ? previousPct + '%' : '—'}</span>
        <span class="compare-val">${latestPct   !== null ? latestPct   + '%' : '—'}</span>
        <span class="compare-delta ${deltaClass}">${deltaLabel}</span>
      </div>
    `;
  }).join('');
}

// ============================================
// 7. AI STUDY PLAN
// ============================================
async function loadStudyPlan() {
  const planText = document.getElementById('plan-text');
  const planGrid = document.getElementById('plan-days-grid');
  if (!planText) return;

  const weakTopics = getAllWeakTopics();
  const subjects   = getSelectedSubjects();
  const hasHistory = subjects.some(s => getQuizHistory(s).length > 0);

  if (!hasHistory) {
    planText.textContent = 'Complete a quiz to get your personalised AI study plan based on your Hindsight memory!';
    planText.className   = 'plan-text';
    if (planGrid) planGrid.style.display = 'none';
    return;
  }

  planText.textContent = 'Generating your personalised study plan...';
  planText.className   = 'plan-text loading';

  // Try backend first
  try {
    const data = await apiCall('/api/ai/study-plan', 'POST', {
      user_id: getUserId(),
    });

    if (data && data.plan) {
      planText.textContent = 'Your personalised plan is ready! Focus on the highlighted subjects.';
      planText.className   = 'plan-text';
      renderPlanDays(data.plan);
      return;
    }
  } catch (e) {
    console.warn('Backend not available, generating local plan.');
  }

  // Local fallback plan
  planText.textContent = 'Based on your quiz history, here\'s your recommended focus this week:';
  planText.className   = 'plan-text';
  renderPlanDays(generateLocalPlan(subjects, weakTopics));
}

function generateLocalPlan(subjects, weakTopics) {
  const days    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const types   = ['focus', 'practice', 'review', 'focus', 'practice', 'review'];
  const plan    = [];

  // Sort subjects: weakest first
  const sorted = [...subjects].sort((a, b) => getOverallAccuracy(a) - getOverallAccuracy(b));

  days.forEach((day, i) => {
    const subject = sorted[i % sorted.length] || subjects[0] || 'General';
    const weak    = (weakTopics[subject] || [])[0] || 'core concepts';
    const type    = types[i];

    plan.push({
      day,
      subject,
      topic:  weak,
      type,
      reason: type === 'focus'    ? 'Weak area — needs attention'
             : type === 'practice' ? 'Practice makes perfect'
             : 'Keep your skills sharp',
    });
  });

  return plan;
}

function renderPlanDays(plan) {
  const grid = document.getElementById('plan-days-grid');
  if (!grid) return;

  grid.style.display = 'grid';
  grid.innerHTML = plan.slice(0, 6).map(p => `
    <div class="plan-day-card ${p.type}">
      <div class="pdc-day">${p.day}</div>
      <div class="pdc-subject">${getSubjectIcon(p.subject)} ${p.subject}</div>
      <div class="pdc-type">${p.reason || p.type}</div>
    </div>
  `).join('');
}

// ============================================
// UTILITY
// ============================================
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}