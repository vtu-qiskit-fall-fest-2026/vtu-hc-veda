/*
 * circuitBuilder.js — the Interactive Circuit Lab.
 *
 * Renders the whole lab page (palette, canvas, simulation, time machine, AI
 * explain) and manages the circuit state: add/undo/clear/save/load gates.
 */
(function (global) {
  'use strict';

  var GATES = [
    { type: 'h',      title: 'Hadamard',   desc: 'Superposition', class: 'g-h',      arity: 1, box: 'H' },
    { type: 'x',      title: 'Pauli-X',    desc: 'Bit flip (NOT)', class: 'g-x',      arity: 1, box: 'X' },
    { type: 'y',      title: 'Pauli-Y',    desc: 'Bit + phase',    class: 'g-y',      arity: 1, box: 'Y' },
    { type: 'z',      title: 'Pauli-Z',    desc: 'Phase flip',     class: 'g-z',      arity: 1, box: 'Z' },
    { type: 's',      title: 'S gate',     desc: 'Quarter phase',  class: 'g-s',      arity: 1, box: 'S' },
    { type: 't',      title: 'T gate',     desc: 'Eighth phase',   class: 'g-t',      arity: 1, box: 'T' },
    { type: 'id',     title: 'Identity',   desc: 'No-op',          class: 'g-id',     arity: 1, box: 'I' },
    { type: 'cx',     title: 'CNOT',       desc: 'Controlled-X',   class: 'g-cx',     arity: 2, box: 'X' },
    { type: 'swap',   title: 'SWAP',       desc: 'Exchange qubits', class: 'g-swap',  arity: 2, box: 'SWAP' },
    { type: 'measure',title: 'Measure',    desc: 'Collapse to 0/1', class: 'g-measure', arity: 1, box: 'M' }
  ];

  var activeGate = 'h';
  var savedKey = 'gq_saved_circuits';

  function gmeta(type) { return GATES.find(function (g) { return g.type === type; }) || GATES[0]; }

  function esc(s) { return global.SIM_ESC(s); }

  function qubitOptions(n, selectedInt) {
    var html = '';
    for (var i = 0; i < n; i++) html += '<option value="' + i + '"' + (i === selectedInt ? ' selected' : '') + '>q' + i + '</option>';
    return html;
  }

  // -------------------- RENDER PAGE --------------------
  function renderCircuitLab() {
    var c = document.getElementById('content');
    var st = global.Circuit.state;
    var n = st.qubits;

    c.innerHTML =
      '<div class="lab-grid">' +
        // ---------- LEFT: control ----------
        '<div>' +
          '<div class="card" style="margin-bottom:16px">' +
            '<h3 class="card-title"><span class="dot"></span>Configure</h3>' +
            '<div class="field"><label>Number of qubits (1\u20135)</label>' +
              '<div class="stepper">' +
                '<button class="stepper-btn" id="qubitMinus">\u2212</button>' +
                '<input id="qubitCount" type="number" min="1" max="5" value="' + n + '">' +
                '<button class="stepper-btn" id="qubitPlus">+</button>' +
              '</div></div>' +
            '<div id="gateListSummary" class="muted" style="font-size:0.82rem"></div>' +
          '</div>' +

          '<div class="card">' +
            '<h3 class="card-title"><span class="dot"></span>Gate palette</h3>' +
            '<div class="palette" id="palette">' + renderPalette() + '</div>' +
            '<div style="margin-top:14px" id="gateConfig">' + renderGateConfig() + '</div>' +
            '<div class="sim-actions">' +
              '<button class="btn btn-primary" id="runBtn">\u25B6 Run Simulation</button>' +
              '<button class="btn btn-secondary" id="undoBtn">Undo</button>' +
              '<button class="btn btn-secondary" id="clearBtn">Clear</button>' +
            '</div>' +
            '<div class="sim-actions">' +
              '<button class="btn btn-cyan btn-sm" id="saveBtn">Save</button>' +
              '<select id="savedCircuits" class="q-select" style="min-width:140px;background:var(--panel-elev);color:var(--text);padding:6px 8px;border:1px solid var(--border);border-radius:8px"></select>' +
              '<button class="btn btn-cyan btn-sm" id="loadBtn">Load</button>' +
              '<button class="btn btn-ghost btn-sm" id="deleteCircuitBtn">Del</button>' +
            '</div>' +
            '<div id="validationPanel" class="mt-16"></div>' +
          '</div>' +
        '</div>' +

        // ---------- RIGHT: canvas + outputs ----------
        '<div>' +
          '<div class="card" style="margin-bottom:16px">' +
            '<h3 class="card-title"><span class="dot"></span>Circuit</h3>' +
            '<div id="circuitCanvas" class="circuit-canvas"></div>' +
          '</div>' +

          '<div class="card" style="margin-bottom:16px">' +
            '<h3 class="card-title"><span class="dot"></span>Measurement results</h3>' +
            '<div id="countsPanel"><p class="muted">Run a simulation to see the probability histogram.</p></div>' +
            '<div id="statevectorPanel"></div>' +
          '</div>' +

          '<div class="card" style="margin-bottom:16px">' +
            '<h3 class="card-title"><span class="dot" style="background:var(--cyan)"></span>Quantum Time Machine</h3>' +
            '<div class="tm-controls">' +
              '<button class="btn btn-secondary btn-sm" id="tmPrev" disabled>\u25C0 Prev</button>' +
              '<button class="btn btn-secondary btn-sm" id="tmPlay" disabled>\u25B6 Play</button>' +
              '<button class="btn btn-secondary btn-sm" id="tmNext" disabled>Next \u25B6</button>' +
              '<span class="tm-step-label" id="tmStepLabel">\u2014</span>' +
            '</div>' +
            '<div id="timeMachinePanel"><p class="muted">Run a simulation to populate the Time Machine.</p></div>' +
          '</div>' +

          '<div class="card">' +
            '<h3 class="card-title"><span class="dot" style="background:var(--purple)"></span>AI \u2014 Explain this circuit</h3>' +
            '<p class="muted" style="font-size:0.85rem">The AI Tutor analyses your circuit and explains each gate and the final state.</p>' +
            '<button class="btn btn-purple btn-sm" id="explainTutorBtn">Explain Circuit</button>' +
            '<div id="tutorExplainPanel" class="mt-16"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    wireLabEvents();
    renderCircuit();
    updateGateSummary();
    refreshSavedDropdown();
  }

  function renderPalette() {
    return GATES.map(function (g) {
      return '<div class="gate-tile' + (g.type === activeGate ? ' selected' : '') + '" data-type="' + g.type + '">' +
        '<span class="gate-chip ' + g.class + '">' + g.box + '</span>' +
        '<span class="gt-info"><div class="gt-name">' + esc(g.title) + '</div><div class="gt-desc">' + esc(g.desc) + '</div></span>' +
        '<span class="badge badge-muted">' + g.arity + 'q</span>' +
        '</div>';
    }).join('');
  }

  function renderGateConfig() {
    var g = gmeta(activeGate);
    var n = global.Circuit.state.qubits;
    var fields;
    if (g.arity === 2) {
      fields = '<div class="q-pair">' +
        '<div class="q-select"><label>Control</label><select id="cfgCtl">' + qubitOptions(n, 0) + '</select></div>' +
        '<div class="q-select"><label>Target</label><select id="cfgTgt">' + qubitOptions(n, n > 1 ? 1 : 0) + '</select></div>' +
        '</div>';
    } else {
      fields = '<div class="q-select"><label>Target qubit</label><select id="cfgTgt">' + qubitOptions(n, 0) + '</select></div>';
    }
    return '<div class="flex-between wrap" style="gap:12px"><div class="flex" style="gap:10px"><span class="gate-chip ' + g.class + '" style="flex:0 0 auto">' + g.box + '</span><div>' +
      '<div style="font-weight:700;font-size:0.9rem">' + esc(g.title) + '</div>' +
      '<div class="muted" style="font-size:0.78rem">' + esc(g.desc) + '</div></div></div>' +
      '<div class="flex" style="gap:10px">' + fields +
      '<button class="btn btn-primary btn-sm" id="addGateBtn">Add</button></div></div>';
  }

  // -------------------- WIRE EVENTS --------------------
  function wireLabEvents() {
    var minus = document.getElementById('qubitMinus');
    var plus = document.getElementById('qubitPlus');
    var count = document.getElementById('qubitCount');
    if (minus) minus.addEventListener('click', function () { setQubitCount(global.Circuit.state.qubits - 1); });
    if (plus) plus.addEventListener('click', function () { setQubitCount(global.Circuit.state.qubits + 1); });
    if (count) count.addEventListener('change', function () { var v = parseInt(count.value, 10); setQubitCount(isNaN(v) ? global.Circuit.state.qubits : v); });

    document.querySelectorAll('.gate-tile').forEach(function (tile) {
      tile.addEventListener('click', function () { selectGate(tile.getAttribute('data-type')); });
    });

    var addBtn = document.getElementById('addGateBtn');
    if (addBtn) addBtn.addEventListener('click', addGateFromConfig);

    var runBtn = document.getElementById('runBtn');
    if (runBtn) runBtn.addEventListener('click', function () {
      global.runSimulation({ button: runBtn });
    });

    var undo = document.getElementById('undoBtn');
    if (undo) undo.addEventListener('click', undoGate);
    var clear = document.getElementById('clearBtn');
    if (clear) clear.addEventListener('click', clearGates);

    var save = document.getElementById('saveBtn');
    if (save) save.addEventListener('click', saveCircuit);
    var load = document.getElementById('loadBtn');
    if (load) load.addEventListener('click', loadCircuit);
    var del = document.getElementById('deleteCircuitBtn');
    if (del) del.addEventListener('click', deleteCircuit);

    var tmPrev = document.getElementById('tmPrev');
    var tmNext = document.getElementById('tmNext');
    var tmPlay = document.getElementById('tmPlay');
    if (tmPrev) tmPrev.addEventListener('click', global.tmPrev);
    if (tmNext) tmNext.addEventListener('click', global.tmNext);
    if (tmPlay) tmPlay.addEventListener('click', global.tmPlay);

    var explain = document.getElementById('explainTutorBtn');
    if (explain) explain.addEventListener('click', function () {
      if (typeof global.explainCircuit === 'function') global.explainCircuit('tutorExplainPanel');
    });
  }

  function selectGate(type) {
    activeGate = type;
    document.querySelectorAll('.gate-tile').forEach(function (t) {
      t.classList.toggle('selected', t.getAttribute('data-type') === type);
    });
    var cfg = document.getElementById('gateConfig');
    if (cfg) cfg.innerHTML = renderGateConfig();
    var addBtn = document.getElementById('addGateBtn');
    if (addBtn) addBtn.addEventListener('click', addGateFromConfig);
  }

  // -------------------- ADD / REMOVE --------------------
  function addGateFromConfig() {
    var g = gmeta(activeGate);
    var n = global.Circuit.state.qubits;
    var qubits;
    if (g.arity === 2) {
      var ctl = parseInt(document.getElementById('cfgCtl').value, 10);
      var tgt = parseInt(document.getElementById('cfgTgt').value, 10);
      qubits = [ctl, tgt];
    } else {
      qubits = [parseInt(document.getElementById('cfgTgt').value, 10)];
    }
    var gate = { type: g.type, qubits: qubits };
    global.Circuit.state.gates.push(gate);
    afterEdit();
  }

  function undoGate() { global.Circuit.state.gates.pop(); afterEdit(); }
  function clearGates() { global.Circuit.state.gates = []; afterEdit(); }

  function afterEdit() {
    renderCircuit();
    updateGateSummary();
    renderValidationNow();
  }

  function renderValidationNow() {
    var payload = { qubits: global.Circuit.state.qubits, gates: global.Circuit.state.gates };
    global.renderValidation(global.validateCircuit(payload));
    if (global.CircuitVisual) global.CircuitVisual.setTutorAvailable(false);
  }

  function updateGateSummary() {
    var el = document.getElementById('gateListSummary');
    if (!el) return;
    var gates = global.Circuit.state.gates;
    if (!gates.length) { el.textContent = 'No gates added yet.'; return; }
    el.textContent = 'Circuit: ' + gates.map(function (g) {
      var m = gmeta(g.type);
      if (g.type === 'cx') return 'CNOT(q' + g.qubits[0] + '\u2192q' + g.qubits[1] + ')';
      if (g.type === 'swap') return 'SWAP(q' + g.qubits[0] + ',q' + g.qubits[1] + ')';
      return m.box + ' q' + g.qubits[0];
    }).join(' \u2192 ');
  }

  // -------------------- RENDER CANVAS --------------------
  function renderCircuit() {
    var canvas = document.getElementById('circuitCanvas');
    if (!canvas) return;
    var n = global.Circuit.state.qubits;
    var gates = global.Circuit.state.gates;
    canvas.innerHTML = '';
    if (!gates.length) {
      canvas.innerHTML = '<p class="empty"><span class="empty-ic">\u2295</span>Add gates from the palette to build your circuit.</p>';
      return;
    }
    var grid = document.createElement('div'); grid.className = 'circuit-grid';
    for (var q = 0; q < n; q++) {
      var wire = document.createElement('div'); wire.className = 'circuit-wire'; wire.dataset.qubit = String(q);
      var label = document.createElement('div'); label.className = 'wire-label'; label.textContent = 'q' + q;
      wire.appendChild(label);
      gates.forEach(function (gate, gi) {
        var cell = document.createElement('div'); cell.className = 'gate-cell';
        var m = gmeta(gate.type);
        if (gate.type === 'cx' || gate.type === 'swap') {
          var a = gate.qubits[0], b = gate.qubits[1];
          if (a === q) {
            if (gate.type === 'cx') {
              var dot = document.createElement('div'); dot.className = 'control-dot'; dot.title = gate.type + ' control';
              cell.appendChild(dot);
            } else {
              var sbox = document.createElement('div'); sbox.className = 'gate-box g-swap'; sbox.textContent = 'SWAP'; cell.appendChild(sbox);
            }
          } else if (b === q) {
            if (gate.type === 'cx') {
              var tbox = document.createElement('div'); tbox.className = 'gate-box g-cx'; tbox.textContent = 'X'; tbox.title = 'CNOT target'; cell.appendChild(tbox);
            } else {
              var sbox2 = document.createElement('div'); sbox2.className = 'gate-box g-swap'; sbox2.textContent = 'SWAP'; cell.appendChild(sbox2);
            }
          } else if ((q > a && q < b) || (q > b && q < a)) {
            var line = document.createElement('div'); line.className = 'vline'; cell.appendChild(line);
          }
        } else if (gate.qubits[0] === q) {
          var box = document.createElement('div');
          box.className = 'gate-box ' + m.class + ' removable';
          box.textContent = m.box;
          box.title = m.title;
          box.addEventListener('click', function (e) { e.stopPropagation(); removeGateAt(gi); });
          cell.appendChild(box);
        }
        wire.appendChild(cell);
      });
      grid.appendChild(wire);
    }
    canvas.appendChild(grid);
  }

  function removeGateAt(idx) {
    global.Circuit.state.gates.splice(idx, 1);
    afterEdit();
  }

  // -------------------- SAVE / LOAD --------------------
  function savedCircuits() {
    var raw = localStorage.getItem(savedKey);
    try { return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  }
  function persistCircuits(list) {
    try { localStorage.setItem(savedKey, JSON.stringify(list)); } catch (e) {}
    // Mirror the user's whole saved-circuit list to the database in live mode.
    var u = global.getAppUser();
    if (global.Api && global.DB_MODE === 'live' && u && u.id) {
      global.Api.put('/data/circuits/sync', { circuits: list }).catch(function () {});
    }
  }

  // Cloud hydration: load the user's saved circuits from the backend into the
  // local cache on app start (keeps the existing synchronous dropdown code).
  var CircuitCloud = {
    hydrate: function (userId) {
      return global.Api.get('/data/circuits').then(function (r) {
        if (r.circuits) {
          try { localStorage.setItem(savedKey, JSON.stringify(r.circuits)); } catch (e) {}
          if (typeof refreshSavedDropdown === 'function') refreshSavedDropdown();
        }
        return r.circuits || [];
      }).catch(function () { return []; });
    }
  };

  function saveCircuit() {
    var gates = global.Circuit.state.gates;
    if (!gates.length) { global.toast('Nothing to save — the circuit is empty.', 'info'); return; }
    var name = prompt('Name this circuit:', 'Circuit ' + (savedCircuits().length + 1));
    if (name == null) return;
    var list = savedCircuits();
    var obj = { id: 'c' + Date.now(), name: name, qubits: global.Circuit.state.qubits, gates: gates.slice() };
    list.unshift(obj);
    persistCircuits(list);
    refreshSavedDropdown();
    global.toast('Circuit saved.', 'success');
    global.CircuitVisual.markCircuitBuilt();
  }

  function refreshSavedDropdown() {
    var sel = document.getElementById('savedCircuits');
    if (!sel) return;
    var list = savedCircuits();
    sel.innerHTML = list.length
      ? list.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('')
      : '<option value="">No saved circuits</option>';
  }

  function loadCircuit() {
    var sel = document.getElementById('savedCircuits');
    var list = savedCircuits();
    if (!sel || !list.length) { global.toast('No saved circuits yet.', 'info'); return; }
    var obj = list.find(function (c) { return c.id === sel.value; });
    if (!obj) { global.toast('Select a saved circuit first.', 'info'); return; }
    global.Circuit.state.qubits = obj.qubits;
    global.Circuit.state.gates = obj.gates.map(function (g) { return { type: g.type, qubits: g.qubits.slice() }; });
    var count = document.getElementById('qubitCount');
    if (count) count.value = String(obj.qubits);
    afterEdit();
    renderCircuitLab();
    global.toast('Loaded "' + obj.name + '".', 'success');
  }

  function deleteCircuit() {
    var sel = document.getElementById('savedCircuits');
    var list = savedCircuits();
    if (!sel || !list.length) return;
    var obj = list.find(function (c) { return c.id === sel.value; });
    if (!obj) return;
    persistCircuits(list.filter(function (c) { return c.id !== obj.id; }));
    refreshSavedDropdown();
    global.toast('Circuit removed.', 'success');
  }

  // -------------------- QUBIT COUNT --------------------
  function setQubitCount(v) {
    v = Math.max(1, Math.min(5, v));
    global.Circuit.state.qubits = v;
    global.Circuit.state.gates = global.Circuit.state.gates.filter(function (g) {
      return g.qubits.every(function (q) { return q < v; });
    });
    var input = document.getElementById('qubitCount');
    if (input) input.value = String(v);
    // Re-render config + circuit + palette availability.
    var cfg = document.getElementById('gateConfig');
    if (cfg) cfg.innerHTML = renderGateConfig();
    var addBtn = document.getElementById('addGateBtn');
    if (addBtn) addBtn.addEventListener('click', addGateFromConfig);
    afterEdit();
  }

  // -------------------- EXPORT --------------------
  global.renderCircuitLab = renderCircuitLab;
  global.renderCircuit = renderCircuit;
  global.updateGateSummary = updateGateSummary;
  global.addGate = addGateFromConfig;
  global.undoGate = undoGate;
  global.clearGates = clearGates;
  global.setQubitCount = setQubitCount;
  global.GATES = GATES;
  global.gmeta = gmeta;
  global.CircuitCloud = CircuitCloud;
})(window);
