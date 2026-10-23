/*
 * dashboard.js — Dashboard (home), Progress, Profile and Settings pages, plus
 * the personalised learning path and achievement badges.
 */
(function (global) {
  'use strict';
  function esc(s) { return global.SIM_ESC(s); }

  // -------------------- ACHIEVEMENTS --------------------
  function achValue(p, metric) {
    switch (metric) {
      case 'lessons': return p.completedLessons.length;
      case 'bestScore': return global.Progress.bestScore(global.getAppUser().id);
      case 'algorithms': return p.algorithmsRun.length;
      case 'circuits': return p.circuitsBuilt;
      case 'streak': return p.streak;
      default: return 0;
    }
  }
  function unlocked(ach, p) { return achValue(p, ach.metric) >= ach.threshold; }

  function achievementList(p) {
    return global.ACHIEVEMENTS.map(function (a) {
      var is = unlocked(a, p);
      return { ach: a, unlocked: is, progressTxt: achValue(p, a.metric) + ' / ' + a.threshold };
    });
  }
  function unlockedCount(p) {
    return global.ACHIEVEMENTS.filter(function (a) { return unlocked(a, p); }).length;
  }

  // -------------------- DASHBOARD --------------------
  function renderDashboard() {
    var c = document.getElementById('content');
    var user = global.getAppUser();
    var p = global.Progress.get(user.id);
    var pct = global.Progress.learningPercent(user.id);
    var alive = user.name.split(' ')[0];
    var best = global.Progress.bestScore(user.id);
    var ach = unlockedCount(p);

    var next = nextLesson(p);
    var today = new Date();
    var dateStr = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    c.innerHTML =
      '<div class="dash-hero">' +
        '<div style="position:relative;z-index:1">' +
          '<span class="badge badge-green">\u2728 ' + esc(dateStr) + '</span>' +
          '<h2 class="mt-8">Welcome back, <span>' + esc(alive) + '</span></h2>' +
          '<p>Your quantum journey is ' + pct + '% complete. Keep building circuits and exploring algorithms.</p>' +
          '<button class="btn btn-primary" id="continueBtn">\u25B6 Continue learning</button>' +
        '</div>' +
      '</div>' +

      '<div class="stat-row mt-24">' +
        statCard('Progress', pct + '%', '\uD83D\uDCC8', 'rgba(34,211,167,0.16)') +
        statCard('Lessons', p.completedLessons.length, '\uD83D\uDCD6', 'rgba(34,201,255,0.16)') +
        statCard('Quiz best', best + '%', '\uD83C\uDFAF', 'rgba(139,92,246,0.16)') +
        statCard('Achievements', ach, '\uD83C\uDFC6', 'rgba(246,185,59,0.16)') +
      '</div>' +

      '<div class="grid grid-2 mt-24">' +
        '<div class="card">' +
          '<h3 class="card-title"><span class="dot"></span>Course progress</h3>' +
          categoryProgress(p) +
        '</div>' +
        '<div class="card">' +
          '<h3 class="card-title"><span class="dot" style="background:var(--cyan)"></span>Recommended next</h3>' +
          (next ? recommCard(next) : '<p class="muted">You\u2019ve explored everything! Try the Algorithm Lab next.</p>') +
          '<p class="muted mt-16" style="font-size:0.85rem">' + esc(learningTip(p)) + '</p>' +
        '</div>' +
      '</div>' +

      '<div class="grid grid-2 mt-24">' +
        '<div class="card">' +
          '<h3 class="card-title"><span class="dot" style="background:var(--purple)"></span>Recent activity</h3>' +
          activityList(p) +
        '</div>' +
        '<div class="card">' +
          '<h3 class="card-title"><span class="dot" style="background:var(--amber)"></span>Streak &amp; stats</h3>' +
          '<div class="flex gap-16 mt-8">' +
            '<div class="stat-card" style="flex:1;text-align:center"><h3>' + p.streak + '\uD83D\uDD25</h3><p>Day streak</p></div>' +
            '<div class="stat-card" style="flex:1;text-align:center"><h3>' + p.circuitsBuilt + '</h3><p>Circuits built</p></div>' +
            '<div class="stat-card" style="flex:1;text-align:center"><h3>' + p.algorithmsRun.length + '</h3><p>Algorithms</p></div>' +
          '</div>' +
          '<button class="btn btn-secondary btn-sm mt-16" id="goProgress">View full progress &rarr;</button>' +
        '</div>' +
      '</div>';

    document.getElementById('continueBtn').addEventListener('click', function () {
      if (next) global.navigate('#/learn/' + next.id);
      else global.navigate('#/learn');
    });
    document.getElementById('goProgress').addEventListener('click', function () { global.navigate('#/progress'); });
  }

  function statCard(label, value, icon, bg) {
    return '<div class="stat-card"><div class="stat-ic" style="background:' + bg + '">' + icon + '</div><h3>' + esc(value) + '</h3><p>' + esc(label) + '</p></div>';
  }

  function nextLesson(p) {
    for (var i = 0; i < global.LESSONS.length; i++) {
      if (p.completedLessons.indexOf(global.LESSONS[i].id) === -1) return global.LESSONS[i];
    }
    return null;
  }

  function recommCard(l) {
    var meta = global.CATEGORY_META[l.category];
    return '<div class="lesson-card" data-id="' + l.id + '">' +
      '<span class="lc-ic" style="background:' + l.color + '22;color:' + l.color + '">' + l.icon + '</span>' +
      '<div class="lc-body"><div class="lc-title">' + esc(l.title) + '</div>' +
      '<div class="lc-meta">' + esc(meta.label) + ' \u00b7 ' + esc(l.duration) + '</div></div></div>';
  }

  function categoryProgress(p) {
    var cats = ['beginner', 'intermediate', 'advanced'];
    return cats.map(function (cat) {
      var all = global.LESSONS.filter(function (l) { return l.category === cat; });
      var done = all.filter(function (l) { return p.completedLessons.indexOf(l.id) !== -1; }).length;
      var pct = all.length ? Math.round(done / all.length * 100) : 0;
      var color = cat === 'beginner' ? '#34d399' : (cat === 'intermediate' ? '#22c9ff' : '#8b5cf6');
      return '<div style="margin-bottom:14px"><div class="flex-between mb-8"><span class="muted" style="font-size:0.88rem">' + esc(global.CATEGORY_META[cat].label) + '</span><span class="muted" style="font-size:0.82rem">' + done + '/' + all.length + '</span></div>' +
        '<div class="progress"><span style="width:' + pct + '%;background:' + color + '"></span></div></div>';
    }).join('');
  }

  function learningTip(p) {
    if (p.quizScores.length && global.Progress.bestScore(global.getAppUser().id) < 70) {
      return 'Tip: based on your quiz results, review Quantum Gates before jumping to advanced algorithms.';
    }
    if (p.algorithmsRun.length === 0) {
      return 'Tip: run an algorithm in the Algorithm Lab to earn the Algorithm Explorer badge.';
    }
    if (p.circuitsBuilt === 0) {
      return 'Tip: open the Circuit Builder and construct the Bell state to see entanglement live.';
    }
    if (p.completedLessons.length < 5) {
      return 'Tip: complete the beginner lessons to reach full superposition mastery.';
    }
    return 'Tip: you\u2019re making great progress \u2014 try a quiz to consolidate your knowledge.';
  }

  function activityList(p) {
    if (!p.activity.length) return '<p class="muted">No activity yet \u2014 start a lesson!</p>';
    var icons = { lesson: '\uD83D\uDCD6', quiz: '\uD83C\uDFAF', algorithm: '\u269B', circuit: '\u2295' };
    var color = { lesson: '#34d399', quiz: '#8b5cf6', algorithm: '#22c9ff', circuit: '#f6b93b' };
    return p.activity.slice(0, 6).map(function (a) {
      var d = new Date(a.time);
      var t = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      return '<div class="activity-item"><div class="activity-ic" style="background:' + (color[a.kind] || '#34d399') + '22;color:' + (color[a.kind] || '#34d399') + '">' + (icons[a.kind] || '\u2605') + '</div>' +
        '<div class="activity-body"><div class="activity-title">' + esc(a.title) + '</div><div class="activity-time">' + esc(t) + '</div></div></div>';
    }).join('');
  }

  // -------------------- PROGRESS --------------------
  function renderProgress() {
    var c = document.getElementById('content');
    var user = global.getAppUser();
    var p = global.Progress.get(user.id);
    var pct = global.Progress.learningPercent(user.id);
    var best = global.Progress.bestScore(user.id);

    var achCards = achievementList(p).map(function (a) {
      return '<div class="ach-card ' + (a.unlocked ? 'unlocked' : 'locked') + '">' +
        '<div class="ach-ic">' + a.ach.icon + '</div>' +
        '<h4>' + esc(a.ach.name) + '</h4>' +
        '<p>' + esc(a.ach.desc) + '</p>' +
        '<div class="ach-status ' + (a.unlocked ? 'badge-green' : 'badge-muted') + '">' + (a.unlocked ? 'Unlocked' : a.progressTxt) + '</div>' +
        '</div>';
    }).join('');

    c.innerHTML =
      '<div class="grid grid-2">' +
        '<div class="card">' +
          '<h3 class="card-title"><span class="dot"></span>Overall learning</h3>' +
          '<div class="flex" style="align-items:center;gap:24px">' +
            '<div class="score-ring"><svg width="120" height="120" viewBox="0 0 120 120">' +
              '<circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10"/>' +
              '<circle cx="60" cy="60" r="52" fill="none" stroke="url(#pp)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (pct / 100 * 327) + ' 327"/>' +
              '<defs><linearGradient id="pp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3a7"/><stop offset="1" stop-color="#22c9ff"/></linearGradient></defs>' +
              '</svg><div class="ring-text"><div><b>' + pct + '%</b><br><span>complete</span></div></div></div>' +
            '<div style="flex:1"><div class="muted" style="margin-bottom:14px;font-size:0.9rem">' + esc(user.name) + '</div>' +
              '<div class="muted mb-8" style="font-size:0.85rem"><strong>' + p.completedLessons.length + '</strong> / ' + global.LESSONS.length + ' lessons</div>' +
              '<div class="progress mb-8"><span style="width:' + Math.round(p.completedLessons.length / global.LESSONS.length * 100) + '%"></span></div>' +
              '<div class="muted mb-8" style="font-size:0.85rem"><strong>' + best + '%</strong> best quiz score</div>' +
              '<div class="progress cyan"><span style="width:' + best + '%"></span></div>' +
            '</div>' +
          '</div>' +
          '<h3 class="card-title mt-24"><span class="dot"></span>Category breakdown</h3>' +
          categoryProgress(p) +
        '</div>' +
        '<div class="card">' +
          '<h3 class="card-title"><span class="dot" style="background:var(--amber)"></span>Achievement badges</h3>' +
          '<div class="ach-grid">' + achCards + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-24">' +
        '<h3 class="card-title"><span class="dot" style="background:var(--purple)"></span>Quiz history</h3>' +
        (p.quizScores.length ? quizHistory(p) : '<p class="muted">You haven\u2019t taken a quiz yet. Head to Quizzes to test yourself.</p>') +
        '<button class="btn btn-cyan btn-sm mt-16" id="goQuiz">Take a quiz &rarr;</button>' +
      '</div>';

    document.getElementById('goQuiz').addEventListener('click', function () { global.navigate('#/quizzes'); });
  }

  function quizHistory(p) {
    return p.quizScores.map(function (s) {
      var col = s.best >= 80 ? '#34d399' : (s.best >= 50 ? '#f6b93b' : '#f87171');
      return '<div class="flex-between" style="padding:12px 0;border-bottom:1px dashed var(--border)">' +
        '<div><div style="font-weight:600">' + esc(s.title) + '</div><div class="muted" style="font-size:0.78rem">' + esc(new Date(s.date).toLocaleDateString()) + '</div></div>' +
        '<span class="badge" style="color:' + col + ';background:' + col + '22;border-color:' + col + '40">' + s.best + '%</span></div>';
    }).join('');
  }

  // -------------------- PROFILE --------------------
  function renderProfile() {
    var c = document.getElementById('content');
    var user = global.getAppUser();
    var p = global.Progress.get(user.id);
    var joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Today';
    var initials = user.name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);

    c.innerHTML =
      '<div class="card">' +
        '<div class="flex" style="gap:24px;align-items:center;flex-wrap:wrap">' +
          '<div class="avatar-lg">' + esc(initials) + '</div>' +
          '<div style="flex:1;min-width:200px"><h3 style="font-size:1.5rem">' + esc(user.name) + '</h3>' +
            '<div class="muted">' + esc(user.email) + '</div>' +
            '<div class="muted mt-8" style="font-size:0.85rem">Member since ' + esc(joined) + '</div></div>' +
          '<div class="flex gap-16">' +
            '<div class="stat-card" style="text-align:center"><h3>' + p.completedLessons.length + '</h3><p>Lessons</p></div>' +
            '<div class="stat-card" style="text-align:center"><h3>' + global.Progress.bestScore(user.id) + '%</h3><p>Best quiz</p></div>' +
            '<div class="stat-card" style="text-align:center"><h3>' + p.streak + '</h3><p>Streak</p></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-24">' +
        '<h3 class="card-title"><span class="dot"></span>About you</h3>' +
        '<p class="muted">' + esc(user.name) + ' is exploring quantum computing with Green Quanta. ' +
          (global.DB_MODE === 'live'
            ? 'Your progress and badges are synced securely to the cloud database.'
            : 'This account uses local demo data \u2014 no live database is connected.') +
        '</p>' +
        '<div class="sim-actions"><button class="btn btn-primary btn-sm" id="goLearn">Start learning</button></div>' +
      '</div>';

    document.getElementById('goLearn').addEventListener('click', function () { global.navigate('#/learn'); });
  }

  // -------------------- SETTINGS --------------------
  function renderSettings() {
    var c = document.getElementById('content');
    c.innerHTML =
      '<div class="card">' +
        '<h3 class="card-title"><span class="dot"></span>Preferences</h3>' +
        settingRow('Reduced motion', 'Disable animations for a calmer experience.', true, 'reducedMotion') +
        settingRow('Learning reminders', 'Get reminded to keep your streak alive.', true, 'reminders') +
        settingRow('Show quantum visuals', 'Enable animations in the simulator and time machine.', true, 'visuals') +
      '</div>' +

      '<div class="card mt-24">' +
        '<h3 class="card-title"><span class="dot" style="background:var(--red)"></span>Account</h3>' +
        '<div class="flex wrap"><button class="btn btn-secondary btn-sm" id="resetProgress">Reset learning progress</button>' +
        '<button class="btn btn-secondary btn-sm" id="resetAll">Reset all data</button></div>' +
        '<div class="flex wrap mt-16"><button class="btn btn-ghost btn-sm" id="logoutSettings">Log out</button></div>' +
      '</div>';

    document.querySelectorAll('.toggle').forEach(function (t) {
      t.addEventListener('click', function () { t.classList.toggle('on'); });
    });
    document.getElementById('resetProgress').addEventListener('click', function () {
      var u = global.getAppUser();
      if (global.Progress.reset) global.Progress.reset(u.id);
      else localStorage.removeItem('gq_progress_' + u.id);
      global.toast('Progress reset.', 'success');
      global.route();
    });
    document.getElementById('resetAll').addEventListener('click', function () {
      if (!confirm('Reset ALL learning data (progress, saved circuits, preferences)? This cannot be undone.')) return;
      var u = global.getAppUser();
      if (global.DB_MODE === 'live' && u && u.id) {
        // Wipe the user's stored data in the cloud too.
        if (global.Progress.reset) global.Progress.reset(u.id);
        if (global.Api) {
          global.Api.put('/data/settings', { settings: {} }).catch(function () {});
          global.Api.put('/data/circuits/sync', { circuits: [] }).catch(function () {});
        }
      }
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf('gq_') === 0) localStorage.removeItem(k); });
      global.Auth.logout();
      location.hash = '#/dashboard';
      location.reload();
    });
    document.getElementById('logoutSettings').addEventListener('click', function () {
      global.Auth.logout();
      global.showAuthView();
    });

    loadPrefs();
  }

  function settingRow(title, desc, on, key) {
    return '<div class="settings-row"><div><div class="sr-title">' + esc(title) + '</div><div class="sr-desc">' + esc(desc) + '</div></div>' +
      '<div class="toggle' + (on ? ' on' : '') + '" data-key="' + key + '"></div></div>';
  }
  function loadPrefs() {
    // Read preferences into toggles (local cache; mirrored to the DB in live mode).
    var prefs = global.Settings ? global.Settings.get() : {};
    document.querySelectorAll('.toggle').forEach(function (t) {
      var k = t.getAttribute('data-key');
      if (prefs[k] === false) t.classList.remove('on');
      t.addEventListener('click', function () { savePrefs(); });
    });
  }
  function savePrefs() {
    var prefs = {};
    document.querySelectorAll('.toggle').forEach(function (t) {
      prefs[t.getAttribute('data-key')] = t.classList.contains('on');
    });
    if (global.Settings) global.Settings.put(prefs);
    else localStorage.setItem('gq_prefs', JSON.stringify(prefs));
  }

  // -------------------- EXPORT --------------------
  global.renderDashboard = renderDashboard;
  global.renderProgress = renderProgress;
  global.renderProfile = renderProfile;
  global.renderSettings = renderSettings;
  global.achievementList = achievementList;
  global.unlockedCount = unlockedCount;
})(window);
