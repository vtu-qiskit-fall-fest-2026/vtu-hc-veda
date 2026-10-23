/*
 * tutor.js — AI Quantum Tutor: a chat interface with rule-based answers, plus
 * the "Explain This Circuit" feature that analyses the shared circuit and tells
 * the learner what each gate does and what the final state means.
 */
(function (global) {
  'use strict';
  function esc(s) { return global.SIM_ESC(s); }

  var history = [];
  var typingTimer = null;
  var reqSeq = 0;  // guards against a stale backend response overwriting a newer question

  function detectTopic(text) {
    // Synonym groups, so a question is matched from its *full* phrasing (not just
    // the first keyword). The topic with the most matched words wins, so longer,
    // more specific questions get the right answer instead of a generic one.
    var TOPICS = {
      qubit: ['qubit', 'quantum bit', 'q-bit', 'what is a qubit', 'bits vs', 'two-level'],
      superposition: ['superposition', 'both states', '0 and 1 at once', '50 50', '50/50', 'super pos'],
      hadamard: ['hadamard', ' h gate', 'h-gate', 'superposition gate', 'equal superposition'],
      entanglement: ['entangl', 'bell state', 'spooky', 'correlat', 'epr', 'entangled'],
      cnot: ['cnot', 'cnx', 'controlled x', 'controlled', 'two-qubit'],
      grover: ['grover', 'grovers', 'search', 'oracle', 'amplitude amplification', 'unstructured'],
      bloch: ['bloch', 'bloch sphere', 'the sphere', 'visuali', 'phase of the state'],
      teleport: ['teleport', 'teleportation', 'send a qubit', 'instant transfer'],
      algorithm: ['algorithm', 'deutsch', 'jozsa', 'shor', 'qft', 'quantum fourier', 'ghz']
    };
    var t = ' ' + text.toLowerCase() + ' ';
    var scores = {};
    for (var key in TOPICS) {
      var s = 0;
      TOPICS[key].forEach(function (kw) { if (t.indexOf(kw) !== -1) s++; });
      if (s) scores[key] = s;
    }
    if (!Object.keys(scores).length) return null;
    var best = null, bestScore = 0;
    Object.keys(scores).forEach(function (k) { if (scores[k] > bestScore) { bestScore = scores[k]; best = k; } });
    return best;
  }

  function answer(text) {
    var topic = detectTopic(text);
    var t = ' ' + text.toLowerCase() + ' ';
    var reply = null;

    if (topic === 'algorithm' || /algorithm|deutsch|jozsa|shor|qft|ghz/.test(t)) {
      reply = 'I can explain Bell, GHZ, Deutsch\u2013Jozsa, Grover, QFT and teleportation. Try running any of them in the Algorithm Lab \u2014 then ask me to unpack the one that interests you.';
    } else if (topic && global.TUTOR_ANSWERS[topic]) {
      reply = global.TUTOR_ANSWERS[topic];
    } else if (/^(hello|hi|hey)\b/.test(t)) {
      reply = 'Hello! I\u2019m your Green Quanta AI Tutor. Ask me about qubits, superposition, the Hadamard or CNOT gate, entanglement, the Bloch sphere, teleportation or Grover\u2019s search \u2014 or tap a suggested question below.';
    } else if (/thank|thx|thanks/.test(t)) {
      reply = 'You\u2019re welcome! Learning quantum computing takes curiosity \u2014 ask me anything, anytime.';
    } else if (/recommend|next|should i learn|what should/.test(t)) {
      reply = 'Based on your progress I\u2019d suggest nailing down superposition and the Hadamard gate first, then trying Grover\u2019s Search in the Algorithm Lab. Want me to explain either of those?';
    } else if (/circuit|gate/.test(t)) {
      reply = 'You can build a circuit in the Circuit Builder and press \u2018Explain this circuit\u2019 right here for a full gate-by-gate breakdown. Or just ask me about a specific gate (H, X, CNOT\u2026) and I\u2019ll walk you through it.';
    } else {
      reply = 'I\u2019m not quite sure I caught that. Try rephrasing \u2014 I\u2019m best at qubits, superposition, the Hadamard and CNOT gates, entanglement, the Bloch sphere, teleportation and Grover\u2019s search. You can also tap a suggested question below.';
    }

    // Never echo the exact same answer for two different questions: if the reply
    // is identical to the last bot message, add a fresh angle so it stays useful.
    var lastBot = history.filter(function (m) { return m.role === 'bot'; }).slice(-1)[0];
    if (lastBot && lastBot.text === reply) {
      reply += '\n\nAnother way to look at it: ' + angle(topic, text);
    }
    return reply;
  }

  function angle(topic, text) {
    var t = ' ' + text.toLowerCase() + ' ';
    if (topic === 'superposition' || /super/.test(t)) return 'a qubit in superposition is a weighted combination of |0\u27E9 and |1\u27E9; measuring it samples that combination with probabilities equal to the squared amplitudes.';
    if (topic === 'entanglement' || /entangl/.test(t)) return 'entanglement means measuring one qubit instantly fixes the other, even far apart \u2014 the Bell circuit is the simplest example.';
    if (topic === 'bloch' || /bloch/.test(t)) return 'the Bloch sphere is a unit sphere; every point maps to one qubit state, with |0\u27E9 and |1\u27E9 as the poles and mostly superposition states around the equator.';
    if (topic === 'hadamard' || /hadamard|h gate/.test(t)) return 'H maps the poles of the Bloch sphere to the equator, turning a definite bit into an equal 50/50 superposition.';
    if (topic === 'grover' || /grover/.test(t)) return 'Grover iterates an oracle and a diffusion operator; each round amplifies the target\u2019s probability so it stands out after roughly \u221AN rounds.';
    return 'sometimes the idea is clearer with a concrete example \u2014 try building a tiny circuit in the Circuit Builder and running it.';
  }

  function renderTutor() {
    var c = document.getElementById('content');
    c.innerHTML =
      '<div class="tutor-wrap">' +
        '<div class="card chat-card">' +
          '<div class="chat-head">' +
            '<div class="chat-av">GQ</div>' +
            '<div><h3>Green Quanta AI Tutor</h3><p>Your personal quantum guide</p></div>' +
            '<div class="chat-status">Online</div>' +
          '</div>' +
          '<div class="chat-body" id="chatBody"></div>' +
          '<div class="chat-input">' +
            '<input type="text" id="chatInput" placeholder="Ask about quantum computing\u2026" autocomplete="off">' +
            '<button id="chatSend" aria-label="Send">\u27A4</button>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<h3 class="card-title"><span class="dot" style="background:var(--cyan)"></span>Suggested questions</h3>' +
          '<div class="mt-8" id="suggestions">' +
            global.TUTOR_SUGGESTIONS.map(function (s) { return '<span class="suggest-tag">' + esc(s) + '</span>'; }).join('') +
          '</div>' +
          '<h3 class="card-title mt-24"><span class="dot" style="background:var(--purple)"></span>Explain a circuit</h3>' +
          '<p class="muted" style="font-size:0.85rem">I can walk through the circuit you built in the Circuit Builder gate by gate.</p>' +
          '<button class="btn btn-purple btn-sm" id="explainCircuitBtn">Explain this circuit</button>' +
          '<div id="tutorExplainPanel" class="mt-16"></div>' +
        '</div>' +
      '</div>';

    wireTutor();
  }

  function wireTutor() {
    var input = document.getElementById('chatInput');
    var send = document.getElementById('chatSend');
    var body = document.getElementById('chatBody');

    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendFromInput(); });
    if (send) send.addEventListener('click', sendFromInput);

    document.querySelectorAll('#suggestions .suggest-tag').forEach(function (tag) {
      tag.addEventListener('click', function () { sendMessage(tag.textContent); });
    });

    var explainBtn = document.getElementById('explainCircuitBtn');
    if (explainBtn) explainBtn.addEventListener('click', function () { explainCircuit('tutorExplainPanel'); });

    // Prepopulate greeting.
    if (!history.length) {
      addBot('Hi ' + esc(global.getAppUser().name.split(' ')[0]) + '! I\u2019m your AI quantum tutor. Ask me anything, or tap a suggested question below to get started.');
    } else {
      body.innerHTML = history.map(function (m) {
        return '<div class="msg ' + m.role + '">' + esc(m.text).replace(/\n/g, '<br>') + '</div>';
      }).join('');
      body.scrollTop = body.scrollHeight;
    }

    // Handle ?q= auto-question (from lesson / algorithm "Ask AI Tutor").
    if (location.hash.indexOf('?q=') !== -1) {
      var q = decodeURIComponent(location.hash.split('?q=')[1]);
      location.hash = '#/tutor';
      sendMessage(q);
    }
  }

  function addBot(text) {
    var body = document.getElementById('chatBody');
    if (!body) return;
    var el = document.createElement('div');
    el.className = 'msg bot';
    el.innerHTML = esc(text).replace(/\n/g, '<br>');
    body.appendChild(el);
    history.push({ role: 'bot', text: text });
    body.scrollTop = body.scrollHeight;
  }

  function addUser(text) {
    var body = document.getElementById('chatBody');
    if (!body) return;
    var el = document.createElement('div');
    el.className = 'msg user';
    el.textContent = text;
    body.appendChild(el);
    history.push({ role: 'user', text: text });
    body.scrollTop = body.scrollHeight;
  }

  function sendFromInput() {
    var input = document.getElementById('chatInput');
    if (!input) return;
    var v = input.value.trim();
    if (!v) return;
    input.value = '';
    sendMessage(v);
  }

  // Ask an answer for the given question. The CURRENT question is always sent
  // to the backend /api/ask endpoint (never reused from a previous one). On any
  // failure we fall back to the local rule-based answer so the chat still works.
  function askAnswer(text, seq) {
    var respond = function (replyText) {
      if (seq !== reqSeq) return; // a newer question was sent; drop this stale reply
      addBot(replyText);
    };

    if (!global.Api || !global.Api.post) {
      console.warn('[tutor] Api helper unavailable, using local fallback:', text);
      respond(answer(text));
      return;
    }
    global.Api.post('/api/ask', { question: text })
      .then(function (res) {
        console.info('[tutor] /api/ask answered topic=', res && res.topic);
        if (res && res.answer) respond(res.answer);
        else respond(answer(text));
      })
      .catch(function (err) {
        console.error('[tutor] /api/ask failed for question=', text, err);
        respond(answer(text));
      });
  }

  function sendMessage(text) {
    addUser(text);
    var seq = ++reqSeq;
    var body = document.getElementById('chatBody');
    var typing = document.createElement('div');
    typing.className = 'msg bot typing';
    typing.textContent = 'Thinking\u2026';
    if (body) { body.appendChild(typing); body.scrollTop = body.scrollHeight; }

    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      askAnswer(text, seq);
    }, 650);
  }

  // -------------------- EXPLAIN CIRCUIT --------------------
  function explainCircuit(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var n = global.Circuit.state.qubits;
    var gates = global.Circuit.state.gates;

    if (!gates.length) {
      panel.innerHTML = '<div class="badge badge-muted">Your circuit is empty. Add some gates in the Circuit Builder first.</div>';
      return;
    }

    var html = '<div class="tutor-interp" style="line-height:1.6;font-size:0.88rem">';

    // Summary
    var labels = gates.map(function (g) { var m = global.gmeta(g.type); return m.box; }).join(' \u2192 ');
    html += '<p><strong>Summary:</strong> You built a ' + n + '-qubit circuit: ' + esc(labels) + '.</p>';

    // Per-gate explanations
    html += '<h4 style="margin:12px 0 6px;color:var(--cyan)">What each gate does</h4><ul style="padding-left:18px;margin:4px 0">';
    gates.forEach(function (g) {
      var m = global.gmeta(g.type);
      var desc = GATE_DESC[g.type] || 'a quantum gate';
      if (g.type === 'cx') desc = 'a controlled-X (CNOT) gate: it flips the target q' + g.qubits[1] + ' only when the control q' + g.qubits[0] + ' is |1\u27E9.';
      if (g.type === 'swap') desc = 'exchanges the states of q' + g.qubits[0] + ' and q' + g.qubits[1] + '.';
      if (g.type === 'measure') desc = 'collapses q' + g.qubits[0] + ' into |0\u27E9 or |1\u27E9 with a definite probability.';
      html += '<li><strong>' + esc(m.title) + '</strong> on q' + (g.qubits.join(', q')) + ' \u2014 ' + esc(desc) + '</li>';
    });
    html += '</ul>';

    // State evolution
    html += '<h4 style="margin:12px 0 6px;color:var(--purple)">How the state evolves</h4>';
    var steps = global.Q.steps(n, gates);
    html += '<ol style="padding-left:18px;margin:4px 0">';
    steps.slice(1).forEach(function (s) {
      var top = topOutcome(s);
      html += '<li><strong>' + esc(s.label) + '</strong> \u2192 ' + esc(top) + '</li>';
    });
    html += '</ol>';

    // Final interpretation
    var finalProbs = global.Q.probabilities(global.Q.run(n, gates));
    var total = Math.pow(2, n);
    var nonzero = [];
    for (var i = 0; i < total; i++) {
      if (finalProbs[i] > 0.001) nonzero.push('|' + i.toString(2).padStart(n, '0') + '\u27E9 (' + Math.round(finalProbs[i] * 100) + '%)');
    }
    html += '<h4 style="margin:12px 0 6px;color:var(--green)">What the output means</h4>';
    html += '<p style="margin:0">Your circuit most likely produces: ' + esc(nonzero.join(', ') || 'nothing') + '. ' + interpretationText(n, gates, finalProbs) + '</p>';
    html += '</div>';

    panel.innerHTML = html;
    global.Progress.addActivity(global.getAppUser().id, 'Explained a circuit with the AI Tutor', 'circuit', '');
  }

  function topOutcome(s) {
    var max = 0, mi = 0;
    s.probabilities.forEach(function (p, i) { if (p > max) { max = p; mi = i; } });
    var n = global.Circuit.state.qubits;
    return 'most likely |' + mi.toString(2).padStart(n, '0') + '\u27E9 (' + Math.round(max * 100) + '%)';
  }

  function interpretationText(n, gates, probs) {
    var hasCX = gates.some(function (g) { return g.type === 'cx'; });
    var hasH = gates.some(function (g) { return g.type === 'h'; });
    var hasSwap = gates.some(function (g) { return g.type === 'swap'; });

    if (n === 2 && gates.length === 2 && gates[0].type === 'h' && gates[1].type === 'cx') {
      return 'This is the canonical Bell state \u2014 the two qubits are maximally entangled, so you only ever see |00\u27E9 and |11\u27E9 together.';
    }
    if (hasCX) return 'The CNOT gate in your circuit entangles qubits, so their measurement outcomes become correlated.';
    if (hasSwap) return 'The SWAP gate reorders your qubits \u2014 it moves information between wires without changing the speeds of a measurement.';
    if (hasH) return 'The Hadamard gate creates superposition, so the measurement is probabilistic and spreads across multiple outcomes.';
    return 'Your circuit has no superposition-creating gates here, so it behaves deterministically.';
  }

  var GATE_DESC = {
    h: 'creates an equal superposition of |0\u27E9 and |1\u27E9 \u2014 the key to quantum speed.',
    x: 'flips the bit, like a NOT gate: |0\u27E9\u2194|1\u27E9.',
    y: 'flips the bit and adds a phase of i \u2014 a combined bit + phase flip.',
    z: 'is a phase flip: |1\u27E9 becomes \u2212|1\u27E9 but |0\u27E9 is unchanged.',
    s: 'applies a quarter-turn phase, mapping |1\u27E9 \u2192 i|1\u27E9.',
    t: 'applies an eighth-turn phase, mapping |1\u27E9 \u2192 e^(i\u03C0/4)|1\u27E9.',
    id: 'is the identity gate and leaves the qubit unchanged.',
    measure: 'collapses the qubit into a definite |0\u27E9 or |1\u27E9 result.'
  };

  global.renderTutor = renderTutor;
  global.sendMessage = sendMessage;
  global.explainCircuit = explainCircuit;
})(window);
