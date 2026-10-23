/*
 * algorithms.js — "Algorithm Lab": run and explore famous quantum algorithms.
 * Simulated locally with the JS statevector engine.
 */
(function (global) {
  'use strict';
  function esc(s) { return global.SIM_ESC(s); }

  // Gate sequences for each preset (mirrors backend/quantum/algorithms.py).
  var PRESET_GATES = {
    bell: [{ type: 'h', qubits: [0] }, { type: 'cx', qubits: [0, 1] }],
    ghz: [{ type: 'h', qubits: [0] }, { type: 'cx', qubits: [0, 1] }, { type: 'cx', qubits: [0, 2] }],
    'deutsch-jozsa': [{ type: 'h', qubits: [0] }, { type: 'h', qubits: [1] }, { type: 'x', qubits: [2] }, { type: 'h', qubits: [2] }, { type: 'cx', qubits: [0, 2] }, { type: 'cx', qubits: [1, 2] }, { type: 'h', qubits: [0] }, { type: 'h', qubits: [1] }],
    grover: [{ type: 'h', qubits: [0] }, { type: 'h', qubits: [1] }, { type: 'cx', qubits: [0, 1] }, { type: 'h', qubits: [1] }, { type: 'z', qubits: [1] }],
    qft: [{ type: 'h', qubits: [0] }, { type: 'cx', qubits: [0, 1] }, { type: 'h', qubits: [1] }, { type: 'cx', qubits: [0, 2] }, { type: 'swap', qubits: [0, 2] }],
    teleport: [{ type: 'h', qubits: [1] }, { type: 'cx', qubits: [1, 2] }, { type: 'cx', qubits: [0, 1] }, { type: 'h', qubits: [0] }, { type: 'cx', qubits: [1, 2] }, { type: 'z', qubits: [0] }]
  };

  var running = false;

  function renderAlgorithms() {
    var c = document.getElementById('content');
    c.innerHTML =
      '<p class="muted mb-16" style="font-size:0.9rem">Explore the algorithms that make quantum computing powerful. Select one to read its intuition, run it, and see the measurement distribution.</p>' +
      '<div class="grid grid-3" id="algoGrid"></div>';

    var grid = document.getElementById('algoGrid');
    grid.innerHTML = global.ALGORITHMS.map(function (a) {
      return '<div class="alg-card" data-id="' + a.id + '">' +
        '<div class="alg-ic">' + a.icon + '</div>' +
        '<div><h3>' + esc(a.name) + '</h3><p>' + esc(a.tagline) + '</p>' +
        '<span class="badge badge-purple">' + a.qubits + ' qubits</span></div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('.alg-card').forEach(function (card) {
      card.addEventListener('click', function () { global.navigate('#/algorithms/' + card.getAttribute('data-id')); });
    });
  }

  function renderAlgorithmDetail(id) {
    var a = global.ALGORITHMS.find(function (x) { return x.id === id; });
    var c = document.getElementById('content');
    if (!a) { c.innerHTML = '<p class="muted">Algorithm not found.</p>'; return; }

    var steps = (a.steps || []).map(function (s, i) {
      return '<div class="step-item"><h4>Step ' + (i + 1) + '</h4><p>' + esc(s) + '</p></div>';
    }).join('');

    c.innerHTML =
      '<div class="card alg-detail">' +
        '<div class="ld-header">' +
          '<div class="alg-ic" style="flex:0 0 auto">' + a.icon + '</div>' +
          '<div><h1 style="font-size:1.6rem;font-weight:800">' + esc(a.name) + '</h1>' +
          '<p class="muted mt-8" style="max-width:720px">' + esc(a.intro) + '</p></div>' +
        '</div>' +

        '<div class="grid grid-2 mt-16">' +
          '<div><h3 class="card-title"><span class="dot"></span>Problem</h3><p style="line-height:1.6;color:var(--text)">' + esc(a.problem) + '</p>' +
          '<h3 class="card-title mt-16"><span class="dot" style="background:var(--purple)"></span>Mathematical concept</h3>' +
          '<div class="math-box">' + esc(a.math) + '</div></div>' +
          '<div><h3 class="card-title"><span class="dot" style="background:var(--cyan)"></span>Circuit</h3>' +
          '<div class="example-box">' + esc(a.circuit) + '</div>' +
          '<h3 class="card-title mt-16"><span class="dot" style="background:var(--amber)"></span>Example</h3>' +
          '<div class="muted" style="font-size:0.85rem"><strong>In:</strong> ' + esc(a.exampleIn) + '</div>' +
          '<div class="muted mt-8" style="font-size:0.85rem"><strong>Out:</strong> ' + esc(a.exampleOut) + '</div></div>' +
        '</div>' +

        '<h3 class="card-title mt-24"><span class="dot"></span>How it works</h3>' +
        '<div class="step-list">' + steps + '</div>' +

        '<div class="sim-actions mt-24">' +
          '<button class="btn btn-primary" id="runAlgoBtn">\u25B6 Run algorithm</button>' +
          '<button class="btn btn-purple btn-sm" id="algoTutorBtn">\uD83E\uDD16 Ask AI Tutor</button>' +
        '</div>' +
        '<div id="algoResults" class="mt-24"></div>' +
        '<div class="mt-16">' + esc(a.explanation) + '</div>' +
      '</div>';

    document.getElementById('runAlgoBtn').addEventListener('click', function () { runAlgorithm(a, this); });
    document.getElementById('algoTutorBtn').addEventListener('click', function () {
      global.navigate('#/tutor?q=' + encodeURIComponent(a.name));
    });
  }

  function runAlgorithm(a, btn) {
    if (running) return;
    running = true;
    if (btn) { btn.disabled = true; btn.textContent = 'Running\u2026'; }

    // Load the algorithm's circuit into the shared builder + simulator.
    var n = a.qubits;
    global.Circuit.state.qubits = n;
    global.Circuit.state.gates = PRESET_GATES[a.preset].map(function (g) { return { type: g.type, qubits: g.qubits.slice() }; });

    var state = global.Q.run(n, global.Circuit.state.gates);
    var probs = global.Q.probabilities(state);
    var counts = global.Q.sampleCounts(state, n, 2048);
    renderAlgoResults(n, probs, counts);

    global.Progress.recordAlgorithm(global.getAppUser().id, a.preset);
    global.updateStreakUI();

    setTimeout(function () {
      running = false;
      if (btn) { btn.disabled = false; btn.textContent = '\u25B6 Run algorithm'; }
      global.toast('Algorithm ran \u2014 check the histogram.', 'success');
    }, 400);
  }

  function renderAlgoResults(n, probs, counts) {
    var el = document.getElementById('algoResults');
    if (!el) return;
    var labels = [];
    for (var i = 0; i < Math.pow(2, n); i++) labels.push(i.toString(2).padStart(n, '0'));
    var maxVal = Math.max.apply(null, labels.map(function (l) { return counts[l] || 0; }).concat([1]));

    var html = '<h3 class="card-title"><span class="dot" style="background:var(--green)"></span>Measurement distribution</h3><div class="chart">';
    labels.forEach(function (lab) {
      var c = counts[lab] || 0;
      html += '<div class="chart-col"><div class="chart-count">' + c + '</div>' +
        '<div class="chart-bar" style="height:' + Math.max(2, c / maxVal * 100) + '%"></div>' +
        '<div class="chart-label">|' + lab + '\u27E9</div></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  global.renderAlgorithms = renderAlgorithms;
  global.renderAlgorithmDetail = renderAlgorithmDetail;
})(window);
