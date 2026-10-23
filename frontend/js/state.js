/*
 * state.js — global app state, localStorage persistence (auth + progress),
 * and a pure-JS quantum statevector simulator.
 *
 * The JS simulator lets the whole platform work with zero backend: it supports
 * H, X, Y, Z, S, T, I, CNOT, SWAP and measurement for up to 5 qubits. When a
 * Qiskit backend is available the UI prefers it (see simulator.js).
 */
(function (global) {
  'use strict';

  // Storage mode. Set from /api/db/status during session restore; defaults to
  // 'demo' so the app is fully functional (localStorage) when Supabase is not
  // configured yet.
  global.DB_MODE = global.DB_MODE || 'demo';

  var LS = {
    users: 'gq_users',
    session: 'gq_session',
    progress: 'gq_progress'
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  }

  // -------------------- AUTH --------------------
  // In live-database mode the auth methods call the Supabase-backed backend and
  // keep the session (with its access token) in localStorage. In demo mode they
  // fall back to the original local behaviour so the app never breaks when the
  // database is not configured yet.
  var Auth = {
    users: function () { return read(LS.users, []); },
    saveUsers: function (u) { write(LS.users, u); },
    session: function () { return read(LS.session, null); },
    saveSession: function (s) { write(LS.session, s); },
    clearSession: function () { localStorage.removeItem(LS.session); },
    live: function () { return global.DB_MODE === 'live'; },

    // Update the cached user (keeping the token) after a server-side refresh.
    updateSession: function (me) {
      var s = Auth.session();
      if (!s) return;
      s.id = me.id; s.name = me.name; s.email = me.email; s.createdAt = me.createdAt;
      Auth.saveSession(s);
    },

    signup: function (name, email, password) {
      if (global.Api && Auth.live()) {
        return global.Api.post('/auth/signup', { name: name, email: email, password: password })
          .then(function (r) {
            Auth.saveSession({ id: r.id, name: r.name, email: r.email, createdAt: r.createdAt, access_token: r.access_token });
            return { user: { id: r.id, name: r.name, email: r.email, createdAt: r.createdAt } };
          })
          .catch(function (e) { return { error: (e && e.message) || 'Sign up failed.' }; });
      }
      var users = Auth.users();
      email = email.toLowerCase().trim();
      if (users.some(function (u) { return u.email === email; })) {
        return Promise.resolve({ error: 'An account with this email already exists. Try signing in.' });
      }
      var user = { id: 'u' + Date.now(), name: name.trim(), email: email, password: password, createdAt: new Date().toISOString() };
      users.push(user);
      Auth.saveUsers(users);
      Auth.saveSession({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
      return Promise.resolve({ user: user });
    },

    login: function (email, password) {
      if (global.Api && Auth.live()) {
        return global.Api.post('/auth/login', { email: email, password: password })
          .then(function (r) {
            Auth.saveSession({ id: r.id, name: r.name, email: r.email, createdAt: r.createdAt, access_token: r.access_token });
            return { user: { id: r.id, name: r.name, email: r.email, createdAt: r.createdAt } };
          })
          .catch(function (e) { return { error: (e && e.message) || 'Invalid email or password.' }; });
      }
      email = email.toLowerCase().trim();
      var user = Auth.users().find(function (u) { return u.email === email; });
      if (!user || user.password !== password) {
        return Promise.resolve({ error: 'Invalid email or password.' });
      }
      Auth.saveSession({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
      return Promise.resolve({ user: user });
    },

    google: function () {
      if (global.Api && Auth.live()) {
        // Real OAuth needs a redirect flow + a configured provider in Supabase;
        // keep the button usable (demo fallback) so the UI is unchanged.
        return Promise.resolve({ error: 'Google sign-in requires OAuth setup. Use email signup, or configure the Google provider in Supabase.' });
      }
      var users = Auth.users();
      var email = 'demo.student@greenquanta.ai';
      var user = users.find(function (u) { return u.email === email; });
      if (!user) {
        user = { id: 'demo', name: 'Demo Student', email: email, password: 'demo', createdAt: new Date().toISOString() };
        users.push(user);
        Auth.saveUsers(users);
      }
      Auth.saveSession({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
      return Promise.resolve({ user: user });
    },

    current: function () {
      var s = Auth.session();
      if (!s) return null;
      // Prefer the user cached on the session (works for live + demo accounts).
      if (s.id && s.name && s.email) return { id: s.id, name: s.name, email: s.email, createdAt: s.createdAt };
      var u = Auth.users().find(function (x) { return x.id === s.id; });
      return u || null;
    },

    logout: function () {
      if (global.Api && Auth.live()) {
        var s = Auth.session(); if (s && s.access_token) global.Api.post('/auth/logout', {}).catch(function () {});
        Auth.clearSession();
        return;
      }
      Auth.clearSession();
    }
  };

  // -------------------- PROGRESS --------------------
  function emptyProgress() {
    return {
      completedLessons: [],
      quizScores: [],        // {quizId, title, score, date}
      algorithmsRun: [],     // algorithm ids
      circuitsBuilt: 0,
      streak: 1,
      lastActive: new Date().toISOString(),
      activity: [],
      tutorQAs: 0
    };
  }

  function progressKey(userId) { return LS.progress + '_' + userId; }

  // In-memory cache used in live-database mode so all the synchronous UI code
  // keeps working; writes are persisted to the backend (debounced).
  var progressCache = {};
  var _persistTimers = {};

  function schedulePersist(userId) {
    var data = progressCache[userId];
    if (!global.Api || !data) return;
    if (_persistTimers[userId]) clearTimeout(_persistTimers[userId]);
    _persistTimers[userId] = setTimeout(function () {
      if (progressCache[userId]) {
        global.Api.put('/data/progress', { progress: progressCache[userId] }).catch(function () {});
      }
    }, 500);
  }

  var Progress = {
    get: function (userId) {
      if (global.DB_MODE === 'live') {
        if (progressCache[userId]) return progressCache[userId];
        return emptyProgress();
      }
      if (!userId) return emptyProgress();
      return read(progressKey(userId), null) || emptyProgress();
    },
    save: function (userId, data) {
      if (global.DB_MODE === 'live') {
        if (userId) { progressCache[userId] = data; schedulePersist(userId); }
        return data;
      }
      write(progressKey(userId), data);
      return data;
    },
    // Seed the cache from the backend (called during session restore).
    loadCloud: function (userId) {
      return global.Api.get('/data/progress').then(function (r) {
        var d = (r.progress && typeof r.progress === 'object' && Object.keys(r.progress).length)
          ? r.progress : emptyProgress();
        progressCache[userId] = d;
        return d;
      }).catch(function () {
        progressCache[userId] = emptyProgress();
        return progressCache[userId];
      });
    },
    // Clear the user's progress (local cache + database in live mode).
    reset: function (userId) {
      var e = emptyProgress();
      if (global.DB_MODE === 'live') { progressCache[userId] = e; schedulePersist(userId); }
      write(progressKey(userId), e);
      return e;
    },

    markLesson: function (userId, lessonId) {
      var p = Progress.get(userId);
      if (p.completedLessons.indexOf(lessonId) === -1) {
        p.completedLessons.push(lessonId);
        Progress.pushActivity(p, 'Completed lesson', 'lesson', lessonId);
      }
      p.lastActive = new Date().toISOString();
      Progress.save(userId, p);
      return p;
    },

    recordQuiz: function (userId, quiz, score) {
      var p = Progress.get(userId);
      var existing = p.quizScores.find(function (s) { return s.quizId === quiz.id; });
      if (!existing) {
        p.quizScores.push({ quizId: quiz.id, title: quiz.title, score: score, best: score, date: new Date().toISOString() });
      } else if (score > existing.best) {
        existing.best = score;
        existing.score = score;
        existing.date = new Date().toISOString();
      }
      Progress.pushActivity(p, 'Scored ' + score + '% on ' + quiz.title, 'quiz', quiz.id);
      Progress.save(userId, p);
      return p;
    },

    recordAlgorithm: function (userId, algId) {
      var p = Progress.get(userId);
      if (p.algorithmsRun.indexOf(algId) === -1) {
        p.algorithmsRun.push(algId);
        Progress.pushActivity(p, 'Explored an algorithm', 'algorithm', algId);
      }
      Progress.save(userId, p);
      return p;
    },

    recordCircuit: function (userId) {
      var p = Progress.get(userId);
      p.circuitsBuilt += 1;
      Progress.pushActivity(p, 'Built a new circuit', 'circuit', '');
      Progress.save(userId, p);
      return p;
    },

    // Mutation-only helper: pushes an activity onto the in-memory progress object.
    // Callers are responsible for saving it (avoids the double-save race where a
    // standalone fetch overwrote the caller's pending changes).
    pushActivity: function (p, title, kind, ref) {
      p.activity.unshift({ title: title, kind: kind, ref: ref, time: new Date().toISOString() });
      if (p.activity.length > 20) p.activity = p.activity.slice(0, 20);
      return p;
    },

    // Standalone, self-contained activity logger (reads + saves itself).
    addActivity: function (userId, title, kind, ref) {
      var p = Progress.get(userId);
      Progress.pushActivity(p, title, kind, ref);
      Progress.save(userId, p);
      // In live mode also append to the dedicated learning-history table so the
      // activity feed is queryable separately (best-effort; never blocks the UI).
      if (global.DB_MODE === 'live' && global.Api) {
        global.Api.post('/data/activity', { t: title, kind: kind || '', ref: ref || '' }).catch(function () {});
      }
    },

    bestScore: function (userId) {
      var p = Progress.get(userId);
      var best = 0;
      p.quizScores.forEach(function (s) { if (s.best > best) best = s.best; });
      return best;
    },

    learningPercent: function (userId) {
      var p = Progress.get(userId);
      if (!global.LESSONS || !global.LESSONS.length) return 0;
      var raw = p.completedLessons.length / global.LESSONS.length * 100;
      // Blend in quiz + algorithm progress so the number feels alive.
      var quizBon = Math.min(20, Math.round(p.quizScores.length * 5));
      var algBon = Math.min(15, Math.round(p.algorithmsRun.length * 3));
      return Math.min(100, Math.round(raw) + quizBon + algBon);
    },

    computeStreak: function (userId) {
      var p = Progress.get(userId);
      var last = p.lastActive ? new Date(p.lastActive) : new Date();
      var today = new Date();
      var diff = Math.floor((today - last) / 86400000);
      if (diff === 0) return Math.max(1, p.streak);
      if (diff === 1) { p.streak += 1; Progress.save(userId, p); return p.streak; }
      return 1;
    }
  };

  // -------------------- UNSERVED CIRCUIT STATE --------------------
  var Circuit = { state: { qubits: 2, gates: [] } };

  function getAppUser() {
    var u = Auth.current();
    return u || { name: 'Guest', id: null, email: '' };
  }

  // -------------------- PURE-JS QUANTUM SIMULATOR --------------------
  var Q = {
    MAX_QUBITS: 5,
    I: 1 / Math.SQRT2,           // 1/sqrt(2)
    ROOT2: Math.SQRT2,

    // Return an array of {re, im} amplitudes, length 2^n.
    zeroState: function (n) {
      var amps = [];
      for (var i = 0; i < Math.pow(2, n); i++) amps.push({ re: i === 0 ? 1 : 0, im: 0 });
      return amps;
    },

    // complex helpers
    cmul: function (a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; },
    cadd: function (a, b) { return { re: a.re + b.re, im: a.im + b.im }; },

    // Single-qubit gate matrix (2x2) as [[{re,im},...],...]
    _singleMatrix: function (type) {
      var h = this.I;
      switch (type) {
        case 'h': return [[{ re: h, im: 0 }, { re: h, im: 0 }], [{ re: h, im: 0 }, { re: -h, im: 0 }]];
        case 'x': return [[{ re: 0, im: 0 }, { re: 1, im: 0 }], [{ re: 1, im: 0 }, { re: 0, im: 0 }]];
        case 'y': return [[{ re: 0, im: 0 }, { re: 0, im: -1 }], [{ re: 0, im: 1 }, { re: 0, im: 0 }]];
        case 'z': return [[{ re: 1, im: 0 }, { re: 0, im: 0 }], [{ re: 0, im: 0 }, { re: -1, im: 0 }]];
        case 's': return [[{ re: 1, im: 0 }, { re: 0, im: 0 }], [{ re: 0, im: 0 }, { re: 0, im: 1 }]];
        case 't': {
          var c = Math.cos(Math.PI / 4), s = Math.sin(Math.PI / 4);
          return [[{ re: 1, im: 0 }, { re: 0, im: 0 }], [{ re: 0, im: 0 }, { re: c, im: s }]];
        }
        case 'id': return [[{ re: 1, im: 0 }, { re: 0, im: 0 }], [{ re: 0, im: 0 }, { re: 1, im: 0 }]];
        default: throw new Error('Unknown gate: ' + type);
      }
    },

    applyGate: function (state, n, type, qubits) {
      var k = Math.pow(2, n);
      var out = new Array(k);
      var self = this;

      if (['h', 'x', 'y', 'z', 's', 't', 'id'].indexOf(type) !== -1) {
        var q = qubits[0];
        var U = this._singleMatrix(type);
        for (var i = 0; i < k; i++) {
          var bit = (i >> q) & 1;
          if (bit === 1) continue;
          var i1 = i | (1 << q);
          var a0 = state[i], a1 = state[i1];
          out[i] = self.cadd(self.cmul(U[0][0], a0), self.cmul(U[0][1], a1));
          out[i1] = self.cadd(self.cmul(U[1][0], a0), self.cmul(U[1][1], a1));
        }
        return out;
      }

      if (type === 'cx') {
        var c = qubits[0], t = qubits[1];
        for (var i2 = 0; i2 < k; i2++) {
          var j = (i2 >> c) & 1 ? (i2 ^ (1 << t)) : i2;
          out[j] = state[i2];
        }
        return out;
      }

      if (type === 'swap') {
        var a = qubits[0], b = qubits[1];
        for (var i3 = 0; i3 < k; i3++) {
          var ba = (i3 >> a) & 1, bb = (i3 >> b) & 1;
          var j2 = i3;
          if (ba !== bb) {
            j2 = i3 ^ (1 << a) ^ (1 << b);
          }
          out[j2] = state[i3];
        }
        return out;
      }

      if (type === 'measure') {
        // Measurement inside a circuit without a classic register: the sim keeps
        // the state but can be sampled by run(). Treat it as identity here.
        return state.slice();
      }

      throw new Error('Unsupported gate: ' + type);
    },

    // Run the full gate list and return the final statevector.
    run: function (n, gates, initial) {
      var state = initial || this.zeroState(n);
      for (var i = 0; i < gates.length; i++) {
        state = this.applyGate(state, n, gates[i].type, gates[i].qubits);
      }
      return state;
    },

    // Probability of each basis state (|amp|²), normalized.
    probabilities: function (state) {
      var probs = state.map(function (a) { return a.re * a.re + a.im * a.im; });
      var total = probs.reduce(function (s, p) { return s + p; }, 0) || 1;
      return probs.map(function (p) { return p / total; });
    },

    // Sample `shots` measurement outcomes from the probabilities.
    sampleCounts: function (state, n, shots) {
      var probs = this.probabilities(state);
      var counts = {};
      for (var s = 0; s < shots; s++) {
        var r = Math.random(), cum = 0, idx = probs.length - 1;
        for (var i = 0; i < probs.length; i++) { cum += probs[i]; if (r <= cum) { idx = i; break; } }
        var key = idx.toString(2).padStart(n, '0');
        counts[key] = (counts[key] || 0) + 1;
      }
      return counts;
    },

    // Format a complex amplitude to a short string like "0.7071" or "0.5+0.5i".
    fmtAmp: function (a) {
      var r = Math.round(a.re * 10000) / 10000;
      var im = Math.round(a.im * 10000) / 10000;
      if (Math.abs(im) < 1e-9) return this._fmt(r);
      var sign = im >= 0 ? '+' : '-';
      return this._fmt(r) + sign + this._fmt(Math.abs(im)) + 'i';
    },
    _fmt: function (x) {
      if (Math.abs(x) < 1e-9) x = 0;
      var s = String(+x.toFixed(4));
      return s;
    },

    // Step-by-step evolution: returns [{label, amplitudes, probabilities}].
    steps: function (n, gates) {
      var steps = [];
      var state = this.zeroState(n);
      steps.push(this._snapshot('initial', state, n));
      for (var i = 0; i < gates.length; i++) {
        state = this.applyGate(state, n, gates[i].type, gates[i].qubits);
        steps.push(this._snapshot(this._describe(gates[i]), state, n));
      }
      return steps;
    },
    _snapshot: function (label, state, n) {
      var k = Math.pow(2, n);
      var amps = [], probs = [];
      var p = this.probabilities(state);
      for (var i = 0; i < k; i++) {
        amps.push(this.fmtAmp(state[i]));
        probs.push(Math.round(p[i] * 10000) / 10000);
      }
      return { label: label, amplitudes: amps, probabilities: probs };
    },
    _describe: function (g) {
      var single = { h: 'H', x: 'X', y: 'Y', z: 'Z', s: 'S', t: 'T', id: 'I', measure: 'M' };
      if (single[g.type]) return single[g.type] + ' on q' + g.qubits[0];
      if (g.type === 'swap') return 'SWAP(q' + g.qubits[0] + ' <-> q' + g.qubits[1] + ')';
      if (g.type === 'cx') return 'CNOT(q' + g.qubits[0] + ' -> q' + g.qubits[1] + ')';
      return g.type.toUpperCase();
    }
  };

  // -------------------- SETTINGS --------------------
  // User preferences are cached locally (so the UI stays synchronous) and
  // mirrored to the database in live mode.
  var Settings = {
    get: function () {
      try { return JSON.parse(localStorage.getItem('gq_prefs')) || {}; } catch (e) { return {}; }
    },
    put: function (prefs) {
      try { localStorage.setItem('gq_prefs', JSON.stringify(prefs)); } catch (e) {}
      var u = Auth.current();
      if (global.Api && global.DB_MODE === 'live' && u && u.id) {
        global.Api.put('/data/settings', { settings: prefs }).catch(function () {});
      }
    },
    loadCloud: function () {
      return global.Api.get('/data/settings').then(function (r) {
        if (r.settings) { try { localStorage.setItem('gq_prefs', JSON.stringify(r.settings)); } catch (e) {} }
        return r.settings || {};
      }).catch(function () { return {}; });
    }
  };

  // -------------------- EXPORT --------------------
  global.Auth = Auth;
  global.Progress = Progress;
  global.Settings = Settings;
  global.Circuit = Circuit;
  global.Q = Q;
  global.getAppUser = getAppUser;
  global.LS_KEYS = LS;
})(window);
