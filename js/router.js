/*
 * router.js — hash-based router, active-nav highlighting, and view switching.
 * Each page's render function is registered by its module (dashboard.js etc.)
 * as a property of `window` (renderDashboard, renderLessons, ...).
 */
(function (global) {
  'use strict';

  var ROUTES = {
    dashboard: { title: 'Dashboard', sub: 'Your learning at a glance', fn: 'renderDashboard' },
    learn: { title: 'Learn Quantum', sub: 'Structured lessons from basics to algorithms', fn: 'renderLessons' },
    algorithms: { title: 'Algorithm Lab', sub: 'Run and explore famous quantum algorithms', fn: 'renderAlgorithms' },
    circuit: { title: 'Circuit Builder & Simulator', sub: 'Build circuits, simulate, and step through the state', fn: 'renderCircuitLab' },
    tutor: { title: 'AI Quantum Tutor', sub: 'Ask anything about quantum computing', fn: 'renderTutor' },
    quizzes: { title: 'Quizzes', sub: 'Test your understanding and track scores', fn: 'renderQuizzes' },
    progress: { title: 'Progress', sub: 'Your achievements and learning journey', fn: 'renderProgress' },
    profile: { title: 'Profile', sub: 'Your account details', fn: 'renderProfile' },
    settings: { title: 'Settings', sub: 'Customise Green Quanta', fn: 'renderSettings' }
  };

  function navigate(hash) {
    if (!hash) hash = '#/dashboard';
    global.location.hash = hash;
  }

  function parseHash() {
    var raw = (global.location.hash || '#/dashboard').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(Boolean);
    if (!parts.length) return { name: 'dashboard', param: null };
    return { name: parts[0], param: parts[1] || null };
  }

  function setActiveNav(name) {
    document.querySelectorAll('.nav-link').forEach(function (a) {
      var r = a.getAttribute('data-route');
      // simulator nav-item maps to the same circuit page; mark it active too.
      var isActive = (r === name) || (name === 'circuit' && r === 'simulator') || (name === 'simulator' && r === 'circuit');
      if (isActive) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  function setPageMeta(title, sub) {
    var t = document.getElementById('pageTitle');
    var s = document.getElementById('pageSubtitle');
    if (t && title) t.textContent = title;
    if (s && sub) s.textContent = sub;
  }

  function route() {
    var r = parseHash();
    var meta = ROUTES[r.name] || ROUTES.dashboard;
    var fnName = meta.fn;

    // Deep-links: lesson detail, algorithm detail, quiz runner.
    if (r.name === 'learn' && r.param) { setActiveNav('learn'); setPageMeta('Learn Quantum', 'Lesson'); closeMobileMenu(); return global.renderLessonDetail(r.param); }
    if (r.name === 'algorithms' && r.param) { setActiveNav('algorithms'); setPageMeta('Algorithm Lab', 'Algorithm'); closeMobileMenu(); return global.renderAlgorithmDetail(r.param); }
    if (r.name === 'quizzes' && r.param) { setActiveNav('quizzes'); setPageMeta('Quizzes', 'Quiz'); closeMobileMenu(); return global.renderQuizRunner(r.param); }

    setActiveNav(r.name);
    setPageMeta(meta.title, meta.sub);
    var fn = global[fnName];
    if (typeof fn === 'function') fn();
    else if (typeof global.renderDashboard === 'function') global.renderDashboard();
    updateStreakUI();
    closeMobileMenu();
  }

  function updateStreakUI() {
    var secs = document.getElementById('streakCount');
    if (secs) {
      var user = global.getAppUser();
      secs.textContent = global.Progress.computeStreak(user.id);
    }
  }

  function closeMobileMenu() {
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
    var ov = document.getElementById('mobileOverlay');
    if (ov) ov.classList.add('hidden');
  }

  function initRouter() {
    global.addEventListener('hashchange', route);

    var menuBtn = document.getElementById('menuBtn');
    var overlay = document.getElementById('mobileOverlay');
    if (menuBtn) menuBtn.addEventListener('click', function () { toggleMobileMenu(); });
    if (overlay) overlay.addEventListener('click', closeMobileMenu);

    var logout = document.getElementById('logoutBtn');
    if (logout) logout.addEventListener('click', function (e) {
      e.preventDefault();
      global.Auth.logout();
      if (typeof global.showAuthView === 'function') global.showAuthView();
    });
  }

  function toggleMobileMenu() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('mobileOverlay');
    if (!sb) return;
    var open = sb.classList.toggle('open');
    if (ov) ov.classList.toggle('hidden', !open);
  }

  global.navigate = navigate;
  global.route = route;
  global.parseHash = parseHash;
  global.setActiveNav = setActiveNav;
  global.setPageMeta = setPageMeta;
  global.updateStreakUI = updateStreakUI;
  global.initRouter = initRouter;
  global.closeMobileMenu = closeMobileMenu;
  global.toggleMobileMenu = toggleMobileMenu;
})(window);
