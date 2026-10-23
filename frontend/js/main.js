/*
 * main.js — application entry point: view switching, toast, sidebar user info,
 * and the CircuitVisual integration object used by the simulator.
 */
(function (global) {
  'use strict';

  var toastTimer = null;
  function toast(message, type) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast' + (type === 'error' ? ' error' : (type === 'success' ? ' success' : ''));
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3600);
  }

  // -------------------- VIEW SWITCHING --------------------
  function enterApp() {
    var user = global.Auth.current();
    if (!user) return showAuthView();
    if (global.QuantumBg) global.QuantumBg.stop();
    document.getElementById('authView').classList.add('hidden');
    document.getElementById('appView').classList.remove('hidden');
    renderSidebarUser(user);
    if (typeof global.updateStreakUI === 'function') global.updateStreakUI();
    if (!location.hash) {
      global.navigate('#/dashboard');
    } else {
      global.route();
    }
  }

  function showAuthView() {
    document.getElementById('appView').classList.add('hidden');
    document.getElementById('authView').classList.remove('hidden');
    if (global.QuantumBg) global.QuantumBg.start();
    global.location.hash = '';
    window.scrollTo(0, 0);
  }

  function renderSidebarUser(user) {
    var side = document.getElementById('sideUser');
    var topAv = document.getElementById('topbarAvatar');
    var initials = user.name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
    if (side) {
      side.innerHTML = '<div class="su-av">' + initials + '</div>' +
        '<div style="min-width:0"><div class="su-name">' + global.SIM_ESC(user.name) + '</div>' +
        '<div class="su-meta">' + global.SIM_ESC(user.email) + '</div></div>';
    }
    if (topAv) topAv.textContent = initials;
  }

  // -------------------- CIRCUIT VISUAL HOOK --------------------
  global.CircuitVisual = {
    afterSimulate: function (payload, data) {
      // Hook for anything that needs the fresh simulation result.
      // Time machine is loaded by simulator.js automatically.
    },
    setTutorAvailable: function (available) {
      var panel = document.getElementById('tutorExplainPanel');
      // No-op in builder; the explain button is always enabled. Reserved hook.
    },
    markCircuitBuilt: function () {
      var u = global.getAppUser();
      if (u.id) {
        global.Progress.recordCircuit(u.id);
        global.updateStreakUI();
      }
    }
  };

  // ==================== QUANTUM BACKGROUND ====================
  // Animated atom + drifting twinkling particles behind the auth/landing view.
  // Canvas-based: cheap, additive glow, pointer-events none, DPR-capped, paused
  // when the tab is hidden, and non-looping under prefers-reduced-motion.
  (function () {
    var canvas = document.getElementById('quantumBg');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, cx = 0, cy = 0;
    var running = false, rafId = 0;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var COLORS = ['#29c7ff', '#3b82f6', '#8b5cf6', '#ec4899'];
    var particles = [], electrons = [];

    function rnd(a, b) { return a + Math.random() * (b - a); }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width || window.innerWidth;
      H = rect.height || window.innerHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2;
      cy = H / 2;
      build();
    }

    function build() {
      electrons = [
        { tilt: -0.35, size: 0.30, ryScale: 0.30, speed: 0.00055, phase: Math.PI * 0.10, color: '#29c7ff' },
        { tilt: 0.55,  size: 0.38, ryScale: 0.24, speed: -0.00044, phase: Math.PI * 0.90, color: '#8b5cf6' },
        { tilt: 2.20,  size: 0.34, ryScale: 0.28, speed: 0.00062, phase: Math.PI * 0.50, color: '#ec4899' }
      ];
      var n = W < 640 ? 26 : 48;
      particles = [];
      for (var i = 0; i < n; i++) {
        particles.push({
          x: rnd(0, W), y: rnd(0, H),
          vx: rnd(-0.05, 0.05), vy: rnd(-0.04, 0.04),
          r: rnd(0.6, 2.1),
          base: rnd(0.2, 0.65),
          tw: rnd(0.0005, 0.0014),
          phase: rnd(0, Math.PI * 2),
          color: COLORS[(Math.random() * COLORS.length) | 0]
        });
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // Orbit ellipses + electrons
      for (var i = 0; i < electrons.length; i++) {
        var e = electrons[i];
        var rx = Math.min(W, H) * e.size;
        var ry = rx * e.ryScale;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(e.tilt);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.10;
        ctx.stroke();
        var a = e.phase + t * e.speed;
        var ex = Math.cos(a) * rx;
        var ey = Math.sin(a) * ry;
        var gr = ctx.createRadialGradient(ex, ey, 0, ex, ey, 7);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)');
        gr.addColorStop(0.35, e.color);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(ex, ey, 7, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();
        ctx.restore();
      }

      // Glowing nucleus (bright cyan core fading to purple)
      var pulse = 1 + Math.sin(t * 0.0009) * 0.05;
      var nr = Math.min(W, H) * 0.085 * pulse;
      var halo = nr * 3.1;
      var ngr = ctx.createRadialGradient(cx, cy, 0, cx, cy, halo);
      ngr.addColorStop(0, 'rgba(255,255,255,0.85)');
      ngr.addColorStop(0.18, 'rgba(127,254,255,0.80)');
      ngr.addColorStop(0.42, 'rgba(41,199,255,0.45)');
      ngr.addColorStop(0.70, 'rgba(139,92,246,0.20)');
      ngr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, halo, 0, Math.PI * 2);
      ctx.fillStyle = ngr;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, nr * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();

      // Drifting, twinkling particles / stars
      for (var j = 0; j < particles.length; j++) {
        var p = particles[j];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
        if (p.y < -4) p.y = H + 4; else if (p.y > H + 4) p.y = -4;
        var alpha = p.base + Math.sin(t * p.tw + p.phase) * 0.4;
        if (alpha < 0.08) alpha = 0.08;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function frame(t) {
      if (!running) return;
      if (!document.hidden) draw(t);   // tab is auto-throttled when hidden
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      resize();
      running = true;
      cancelAnimationFrame(rafId);
      if (reduced) { draw(0); return; }  // static pose, no continuous loop
      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    window.addEventListener('resize', function () {
      if (running) resize();
    });

    global.QuantumBg = { start: start, stop: stop };
  })(); // end QuantumBg

  // -------------------- INIT --------------------
  function init() {
    global.initAuth();
    global.initRouter();
    global.restoreSession();
    global.probeBackend().then(function (up) {
      // Log backend availability to console only (UI does not need it).
      if (typeof console !== 'undefined') console.log('[Green Quanta] Qiskit backend', up ? 'online' : 'offline (using JS simulator)');
    });
  }

  global.toast = toast;
  global.showToast = toast;
  global.enterApp = enterApp;
  global.showAuthView = showAuthView;
  global.renderSidebarUser = renderSidebarUser;
  // -------------------- DB MODE + DATA HYDRATION --------------------
  function resolveDbMode() {
    return global.Api.get('/db/status').then(function (s) {
      global.DB_MODE = (s && s.mode === 'live') ? 'live' : 'demo';
      return s;
    }).catch(function () { global.DB_MODE = 'demo'; });
  }

  // Pull progress, settings and saved circuits from the backend into the
  // synchronous frontend caches before the app renders.
  function hydrateData(userId) {
    var tasks = [];
    if (typeof global.Progress.loadCloud === 'function') tasks.push(global.Progress.loadCloud(userId));
    if (typeof global.Settings.loadCloud === 'function') tasks.push(global.Settings.loadCloud());
    if (global.CircuitCloud && typeof global.CircuitCloud.hydrate === 'function') tasks.push(global.CircuitCloud.hydrate(userId));
    return Promise.all(tasks).catch(function () {});
  }

  // Called by auth.js after a successful signup / login / Google (live or demo).
  global.completeLogin = function () {
    var u = global.Auth.current();
    if (!u) { enterApp(); return; }
    if (global.DB_MODE === 'live' && u.id) hydrateData(u.id).then(function () { enterApp(); });
    else enterApp();
  };

  global.restoreSession = function () {
    resolveDbMode().then(function () {
      var u = global.Auth.current();
      if (!u) { showAuthView(); return; }
      if (global.DB_MODE === 'live') {
        // Validate the cached token against Supabase, refresh the user, hydrate data.
        global.Api.get('/auth/me').then(function (me) {
          global.Auth.updateSession(me);
          hydrateData(me.id).then(function () { enterApp(); });
        }).catch(function () {
          global.Auth.clearSession();
          showAuthView();
        });
      } else {
        enterApp();
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);
})(window);
