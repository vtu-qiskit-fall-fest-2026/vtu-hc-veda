/*
 * timeMachine.js — "Quantum Time Machine": replay the circuit one gate at a time
 * and watch the statevector amplitudes / probabilities change after each gate.
 * Uses the pure-JS simulator (state.js) so it works offline.
 */
(function (global) {
  'use strict';

  var tmState = { steps: [], index: 0, playing: false, timer: null };

  function loadTimeMachine() {
    clearInterval(tmState.timer);
    tmState.playing = false;
    tmState.index = 0;

    var panel = document.getElementById('timeMachinePanel');
    var n = global.Circuit.state.qubits;
    var gates = global.Circuit.state.gates;

    if (!panel) return;
    if (!gates.length) {
      panel.innerHTML = '<p class="empty"><span class="empty-ic">⧗</span>Build a circuit first, then run it.\nThe Time Machine steps through each gate.</p>';
      disableControls();
      return;
    }

    panel.innerHTML = '<p class="muted">Generating steps\u2026</p>';
    // Compute the full state evolution locally.
    var steps = global.Q.steps(n, gates);
    tmState.steps = steps;
    tmState.index = 0;
    renderTimeStep();
    enableControls();
  }

  function renderTimeStep() {
    var panel = document.getElementById('timeMachinePanel');
    var stepLabel = document.getElementById('tmStepLabel');
    if (!panel) return;
    if (!tmState.steps.length) { panel.innerHTML = '<p class="muted">No steps available.</p>'; return; }

    var step = tmState.steps[tmState.index];
    var n = global.Circuit.state.qubits;
    var total = step.probabilities.length;
    var maxProb = Math.max.apply(null, step.probabilities.concat([0.0001]));

    if (stepLabel) stepLabel.textContent = 'Step ' + tmState.index + '/' + (tmState.steps.length - 1) + ' \u2014 ' + step.label;

    var html = '<div style="margin-bottom:8px;font-weight:700;font-size:0.9rem">' + esc(step.label) + '</div>';
    html += '<div class="tm-bars">';
    for (var i = 0; i < total; i++) {
      var prob = step.probabilities[i];
      html += '<div class="tm-bar-col">' +
        '<div class="tm-bar" style="height:' + Math.max(1, (prob / maxProb) * 100) + '%" title="p=' + prob + '"></div>' +
        '<div class="tm-amp">' + esc(step.amplitudes[i]) + '</div>' +
        '<div class="tm-prob">' + prob.toFixed ? prob.toFixed(3) : prob + '</div>' +
        '</div>';
    }
    html += '</div>';
    panel.innerHTML = html;
  }

  function enableControls() {
    var prev = document.getElementById('tmPrev');
    var next = document.getElementById('tmNext');
    var play = document.getElementById('tmPlay');
    if (prev) prev.disabled = tmState.index <= 0;
    if (next) next.disabled = tmState.index >= tmState.steps.length - 1;
    if (play) { play.disabled = false; play.textContent = '\u25B6 Play'; }
  }
  function disableControls() {
    ['tmPrev', 'tmNext', 'tmPlay'].forEach(function (id) {
      var b = document.getElementById(id); if (b) b.disabled = true;
    });
    var sl = document.getElementById('tmStepLabel'); if (sl) sl.textContent = '\u2014';
  }

  function tmPrev() {
    if (tmState.index > 0) { tmState.index--; renderTimeStep(); }
    enableControls();
  }
  function tmNext() {
    if (tmState.index < tmState.steps.length - 1) { tmState.index++; renderTimeStep(); }
    if (tmState.index >= tmState.steps.length - 1) pauseTimeMachine();
    enableControls();
  }
  function tmPlay() {
    var play = document.getElementById('tmPlay');
    if (tmState.playing) { pauseTimeMachine(); return; }
    if (tmState.index >= tmState.steps.length - 1) { tmState.index = 0; renderTimeStep(); }
    tmState.playing = true;
    if (play) play.textContent = '\u23F8 Pause';
    tmState.timer = setInterval(function () {
      if (tmState.index >= tmState.steps.length - 1) { pauseTimeMachine(); return; }
      tmNext();
    }, 850);
  }
  function pauseTimeMachine() {
    tmState.playing = false;
    clearInterval(tmState.timer);
    var play = document.getElementById('tmPlay');
    if (play) play.textContent = '\u25B6 Play';
  }

  function esc(s) { return global.SIM_ESC(s); }

  global.loadTimeMachine = loadTimeMachine;
  global.tmPrev = tmPrev;
  global.tmNext = tmNext;
  global.tmPlay = tmPlay;
  global.pauseTimeMachine = pauseTimeMachine;
  global.renderTimeStep = renderTimeStep;
})(window);
