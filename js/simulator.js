/*
 * simulator.js — run a circuit and visualise the measurement outcome.
 *
 * It uses the Qiskit backend when it is reachable and otherwise falls back to
 * the pure-JS statevector simulator in state.js, so the platform always works.
 * Also contains the intelligent circuit validation (error detection).
 */
(function (global) {
  'use strict';

  var backendUp = null; // null = unknown, true/false once probed

  function probeBackend() {
    if (backendUp !== null) return Promise.resolve(backendUp);
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 1500);
    return fetch('/api/health', { signal: ctrl.signal })
      .then(function (res) { backendUp = res.ok; return backendUp; })
      .catch(function () { backendUp = false; return false; })
      .finally(function () { clearTimeout(timer); });
  }

  function isBackendUp() { return backendUp === true; }

  function buildPayload() {
    return {
      qubits: global.Circuit.state.qubits,
      shots: 1024,
      gates: global.Circuit.state.gates.slice()
    };
  }

  // -------------------- VALIDATION --------------------
  var SINGLE = { h: 1, x: 1, y: 1, z: 1, s: 1, t: 1, id: 1, measure: 1 };
  var PAIR = { cx: 2, swap: 2 };

  function validateCircuit(payload) {
    var issues = [];
    var n = payload.qubits;
    payload.gates.forEach(function (g, idx) {
      var type = g.type, qs = g.qubits || [];
      if (SINGLE[type]) {
        if (qs.length !== 1) issues.push({ code: 'wrong_arity', message: "Gate '" + type + "' needs exactly one target qubit. Choose a target in the palette." });
        else if (qs[0] < 0 || qs[0] >= n) issues.push({ code: 'out_of_range', message: "Gate '" + type + "' references q" + qs[0] + ", but this circuit only has " + n + " qubit(s)." });
      } else if (PAIR[type]) {
        if (qs.length !== 2) issues.push({ code: 'wrong_arity', message: 'Your ' + type.toUpperCase() + ' gate requires two qubits (e.g. a control and a target).' });
        else {
          if (qs[0] === qs[1]) issues.push({ code: 'same_qubit', message: 'Your ' + type.toUpperCase() + ' gate uses the same qubit twice (q' + qs[0] + '). Pick two different qubits.' });
          qs.forEach(function (q) { if (q < 0 || q >= n) issues.push({ code: 'out_of_range', message: 'Your ' + type.toUpperCase() + ' gate references q' + q + ', which is out of range.' }); });
        }
      } else {
        issues.push({ code: 'unknown_gate', message: "Unsupported gate '" + type + "'. Use H, X, Y, Z, S, T, CNOT, SWAP, or Measure." });
      }
    });
    return { valid: issues.length === 0, issues: issues };
  }

  // -------------------- SIMULATION --------------------
  var RUNNING = false;

  function runSimulation(opts) {
    if (RUNNING) return;
    var payload = buildPayload();
    var button = opts && opts.button;
    if (button) { button.disabled = true; button.textContent = 'Running\u2026'; button.classList.add('btn-loading'); }

    var v = validateCircuit(payload);
    if (!v.valid) {
      renderValidation(v);
      if (button) { button.className = button.className.replace(/\s*btn-loading\b/g, ''); button.disabled = false; button.textContent = '\u25B6 Run Simulation'; }
      global.toast(v.issues[0].message, 'error');
      return;
    }

    RUNNING = true;
    probeBackend().then(function (up) {
      if (up) { return runOnBackend(payload); }
      return runOnJS(payload);
    }).then(function (data) {
      renderResults(payload, data);
    }).catch(function (err) {
      global.toast(err && err.message ? err.message : 'Simulation failed.', 'error');
      renderValidation({ valid: false, issues: [{ code: 'run', message: 'Simulation error: ' + (err && err.message ? err.message : 'unknown') }] });
    }).finally(function () {
      RUNNING = false;
      if (button) { button.className = button.className.replace(/\s*btn-loading\b/g, ''); button.disabled = false; button.textContent = '\u25B6 Run Simulation'; }
    });
  }

  function runOnBackend(payload) {
    return fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) { return res.json().then(function (e) { throw new Error(e.detail || 'Simulation failed'); }); }
      return res.json();
    }).catch(function (e) {
      backendUp = false;
      return runOnJS(payload);
    });
  }

  function runOnJS(payload) {
    var state = global.Q.run(payload.qubits, payload.gates);
    var probs = global.Q.probabilities(state);
    var counts = global.Q.sampleCounts(state, payload.qubits, payload.shots);
    var amps = [];
    for (var i = 0; i < Math.pow(2, payload.qubits); i++) amps.push(global.Q.fmtAmp(state[i]));
    return Promise.resolve({
      counts: counts,
      statevector: amps,
      probabilities: probs.map(function (p) { return Math.round(p * 10000) / 10000; })
    });
  }

  function renderResults(payload, data) {
    var opts = global.CircuitVisual;
    if (opts && opts.afterSimulate) opts.afterSimulate(payload, data);

    renderHistogram(payload, data);
    renderStatevector(payload, data);
    // Reset the time machine so it matches this run.
    if (typeof global.loadTimeMachine === 'function') global.loadTimeMachine();
    // Enable the AI "Explain This Circuit" affordance.
    if (opts) opts.setTutorAvailable(true);
  }

  function renderHistogram(payload, data) {
    var panel = document.getElementById('countsPanel');
    if (!panel) return;
    panel.innerHTML = '';
    var n = payload.qubits;
    var labels = [];
    for (var i = 0; i < Math.pow(2, n); i++) labels.push(i.toString(2).padStart(n, '0'));

    var counts = data.counts || {};
    var probs = data.probabilities;
    var maxVal = 0;
    labels.forEach(function (l) { var c = counts[l] || 0; if (c > maxVal) maxVal = c; });
    maxVal = Math.max(1, maxVal);

    var chart = document.createElement('div');
    chart.className = 'chart';
    labels.forEach(function (lab) {
      var count = counts[lab] || 0;
      var prob = probs ? probs[labels.indexOf(lab)] : (count / 1024);
      var col = document.createElement('div');
      col.className = 'chart-col';

      var cEl = document.createElement('div');
      cEl.className = 'chart-count';
      cEl.textContent = String(count);
      col.appendChild(cEl);

      var bar = document.createElement('div');
      bar.className = 'chart-bar';
      bar.style.height = Math.max(2, (count / maxVal) * 100) + '%';
      bar.title = '|' + lab + '\u27E9 p=' + (Math.round(prob * 10000) / 10000);
      col.appendChild(bar);

      var lblEl = document.createElement('div');
      lblEl.className = 'chart-label';
      lblEl.textContent = '|' + lab + '\u27E9';
      col.appendChild(lblEl);

      chart.appendChild(col);
    });
    panel.appendChild(chart);
  }

  function renderStatevector(payload, data) {
    var el = document.getElementById('statevectorPanel');
    if (!el) return;
    var amps = data.statevector || [];
    el.innerHTML = '<h4 class="card-title" style="margin:12px 0 8px"><span class="dot"></span>Final statevector</h4>' +
      '<div class="statevec">' + amps.map(function (a) { return '<span>' + esc(a) + '</span>'; }).join('  ') + '</div>';
  }

  function renderValidation(v) {
    var panel = document.getElementById('validationPanel');
    if (!panel) return;
    panel.innerHTML = '';
    if (v.valid) {
      panel.innerHTML = '<div class="badge badge-green">\u2713 Circuit looks valid</div>';
      return;
    }
    panel.innerHTML = '<h4 class="card-title" style="margin-bottom:10px"><span class="dot" style="background:var(--red)"></span>Issues to fix</h4>' +
      v.issues.map(function (iss) {
        return '<div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:10px;padding:10px 12px;margin-bottom:8px;font-size:0.86rem;color:#fecaca">' +
          '<strong>' + esc(iss.code.replace(/_/g, ' ')) + ':</strong> ' + esc(iss.message) + '</div>';
      }).join('');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  global.runSimulation = runSimulation;
  global.validateCircuit = validateCircuit;
  global.renderValidation = renderValidation;
  global.probeBackend = probeBackend;
  global.isBackendUp = isBackendUp;
  global.SIM_ESC = esc;
})(window);
