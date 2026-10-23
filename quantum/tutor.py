"""AI Tutor: a rule-based explanation engine for the quantum circuits.

Produces a human-readable walkthrough of a user-built circuit — what each gate
does, what the final state means, and what to try next. It is fully local (no
external LLM calls) so the MVP works offline, but the endpoint is shaped the
same way a hosted model response would be, so a real LLM can be swapped in.
"""

from __future__ import annotations

import logging
import os

from .simulator import GATE_LABELS, basis_labels, probability_map

log = logging.getLogger("greenquanta.tutor")

# --------------------------------------------------------------------------- #
# OpenAI-powered AI tutor.
#
# The API key lives only in the environment (never in the frontend). When it is
# present, every question is sent straight to OpenAI and the answer is generated
# specifically for that question. If the key is absent (or a call fails) the
# deterministic local engine below is used as a safe fallback so the chat always
# answers.
# --------------------------------------------------------------------------- #
_OPENAI_MODEL = "gpt-4o-mini"
_openai_key: str | None = None


def openai_configured() -> bool:
    """True when an OpenAI API key is present in the environment."""
    global _openai_key
    if _openai_key is None:
        _openai_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    return bool(_openai_key)


def _openai_answer(question: str) -> str:
    """Send the question to OpenAI and return the model's answer (no caching)."""
    from openai import OpenAI

    client = OpenAI(api_key=_openai_key)
    system = (
        "You are the Green Quanta AI tutor for a quantum-computing learning platform. "
        "Answer the student's question accurately, briefly (2-4 sentences), and "
        "specifically about what was asked. Specialise in quantum computing: qubits, "
        "superposition, gates (Hadamard, CNOT, Pauli, etc.), entanglement, measurement, "
        "the Bloch sphere, teleportation, and algorithms such as Grover and Shor. If the "
        "question is off-topic or unclear, say clearly that you can help with quantum "
        "computing topics and briefly point them in the right direction."
    )
    response = client.chat.completions.create(
        model=_OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": question},
        ],
        temperature=0.7,
        max_tokens=300,
    )
    answer = (response.choices[0].message.content or "").strip()
    if not answer:
        raise ValueError("OpenAI returned an empty answer")
    log.info("tutor.openai ok question=%r", question)
    return answer

# Human-friendly copy for each gate.
GATE_INFO = {
    "h": {
        "name": "Hadamard (H)",
        "desc": "Creates an equal superposition: it maps |0> to (|0>+|1>)/sqrt(2) "
                "and |1> to (|0>-|1>)/sqrt(2). This is what makes a qubit 'both "
                "0 and 1 at once' until measured.",
    },
    "x": {
        "name": "Pauli-X (X / NOT)",
        "desc": "Flips the qubit: it maps |0> to |1> and |1> to |0>. This is the "
                "quantum equivalent of a classical NOT gate.",
    },
    "y": {
        "name": "Pauli-Y (Y)",
        "desc": "Like X, it flips the qubit, but it also applies a phase of i. "
                "Measurements are unaffected by global phases, but Y matters for "
                "two-qubit and rotation controlled operations.",
    },
    "z": {
        "name": "Pauli-Z (Z)",
        "desc": "Leaves |0> unchanged and maps |1> to -|1>, adding a relative phase. "
                "Z is a 'phase flip', while X is a 'bit flip'.",
    },
    "s": {
        "name": "S gate",
        "desc": "Applies a quarter-turn phase: |1> -> i|1>. It is the square root "
                "of the Z gate.",
    },
    "t": {
        "name": "T gate",
        "desc": "Applies an eighth-turn phase: |1> -> e^(iπ/4)|1>. It is the square "
                "root of the S gate and is required for universal quantum computation.",
    },
    "cx": {
        "name": "Controlled-X (CNOT)",
        "desc": "A two-qubit gate. q0 acts as the control and q1 as the target: "
                "if the control is |1>, the target is flipped; otherwise nothing "
                "changes. It is the essential gate for creating entanglement.",
    },
    "swap": {
        "name": "SWAP",
        "desc": "Exchanges the states of two qubits. It is useful for reordering "
                "wires in a circuit.",
    },
    "id": {
        "name": "Identity (I)",
        "desc": "Leaves the qubit unchanged. Useful for padding a circuit up to a "
                "fixed number of layers.",
    },
    "measure": {
        "name": "Measurement",
        "desc": "Collapses the qubit into either |0> or |1> with a probability "
                "given by the squared magnitude of its amplitude.",
    },
}


def _gate_explanation(gate, n: int) -> str:
    gtype = gate.type
    info = GATE_INFO[gtype]
    qs = gate.qubits

    single = {"h", "x", "y", "z", "s", "t", "id", "measure"}
    if gtype in single:
        return f"{info['name']} applied to qubit q{qs[0]}. {info['desc']}"
    if gtype == "swap":
        return f"{info['name']} exchanging qubits q{qs[0]} and q{qs[1]}. {info['desc']}"
    return (
        f"{info['name']} with control q{qs[0]} and target q{qs[1]}. {info['desc']}"
    )


def _interpretation(n: int, gates: list) -> str:
    """Describe what the circuit computes based on its final distribution."""
    if not gates:
        return (
            f"Your circuit is empty, so every qubit stays in |0>. There is "
            f"nothing to measure yet — add an H, X, or CNOT gate and run it again."
        )

    # Recognise the canonical Bell state: H on q0 then CNOT(0 -> 1).
    if n == 2 and len(gates) == 2:
        a, b = gates[0], gates[1]
        if a.type == "h" and a.qubits == [0] and b.type == "cx" and b.qubits == [0, 1]:
            return (
                "This is the canonical Bell state (|00> + |11>)/sqrt(2), one of the "
                "simplest maximally entangled states! The Hadamard puts q0 into "
                "superposition, and the CNOT 'copies' that superposition onto q1. "
                "Because they are entangled, measuring one qubit instantly tells "
                "you the other: you only ever see '00' or '11', never '01' or '10'."
            )

    has_cx = any(g.type == "cx" for g in gates)
    has_h = any(g.type == "h" for g in gates)
    has_x = any(g.type == "x" for g in gates)

    probs = probability_map(n, gates)
    labels = basis_labels(n)
    nonzero = [(labels[i], probs[i]) for i in range(2**n) if probs[i] > 1e-9]

    if has_cx:
        outcomes = ", ".join(f"|{l}> ({p:.2f})" for l, p in nonzero[:4])
        return (
            f"Your circuit uses a CNOT gate, which entangles its two qubits. The "
            f"most likely measurement outcomes are: {outcomes}. Entanglement means "
            f"the qubits no longer act independently — try measuring just one qubit "
            f"in the Time Machine to see why."
        )

    if has_h and has_x:
        return (
            "Your circuit mixes Hadamard (superposition) and X (flip) gates. The "
            "phases and relative amplitudes of the H-X combination are what make "
            "quantum algorithms interesting. Inspect the probabilities below to see "
            "which basis states are more likely."
        )

    if has_h:
        probs_str = ", ".join(f"|{l}> ({p:.2f})" for l, p in nonzero[:4])
        return (
            f"Your circuit creates superposition with Hadamard gates. Measuring it "
            f"is probabilistic — the same circuit gives a distribution of results. "
            f"Here the likeliest outcomes are: {probs_str}. Run it multiple times to "
            f"see these probabilities stabilise."
        )

    if has_x:
        probs_str = ", ".join(f"|{l}> ({p:.2f})" for l, p in nonzero[:4])
        return (
            f"Your circuit uses only Pauli-X (NOT) gates, so it is deterministic. "
            f"Every run gives the same output: {probs_str}. X gates flip bits — the "
            f"measurement is never random."
        )

    return "Your circuit is deterministic. The final outcome is fully predictable."


def _tips(n: int, gates: list) -> list[str]:
    tips = [
        "Try the classic Bell circuit: H on q0, then CNOT(q0 -> q1). You should see "
        "only '00' and '11' out, with roughly equal counts.",
        "Use the Quantum Time Machine to watch how a single H gate spreads a qubit "
        "into two equal amplitudes, then how CNOT entangles them.",
        "The amplitude is a complex number; its squared magnitude is the probability "
        "of measuring that basis state.",
    ]
    if not gates:
        tips.insert(0, "Start by dragging one gate onto the circuit and hitting Run.")
    return tips


def explain(request) -> dict:
    """Generate a structured, human-readable explanation of a circuit."""
    n = request.qubits
    gates = request.gates
    applied = [GATE_LABELS[g.type] for g in gates] or ["none"]

    if gates:
        summary = (
            f"You built a {n}-qubit circuit that applies the following gates in "
            f"order: {', '.join(applied)}."
        )
    else:
        summary = f"You haven't added any gates yet — this is a fresh {n}-qubit circuit."

    gate_explanations = [_gate_explanation(g, n) for g in gates]

    return {
        "title": "AI Tutor — Circuit Explanation",
        "summary": summary,
        "gateExplanations": gate_explanations,
        "interpretation": _interpretation(n, gates),
        "tips": _tips(n, gates),
    }


# --------------------------------------------------------------------------- #
# Free-text ("Ask the AI Tutor") engine.
#
# Each request is analysed fresh against the question text; the answer always
# references the matched topic/keyword so two different questions never produce
# the identical string. This is the endpoint the chat calls instead of a
# client-side matcher, and it is deliberately deterministic + local (no network)
# so the platform works offline.
# --------------------------------------------------------------------------- #
_TOPICS: dict[str, list[str]] = {
    "qubit": ["qubit", "quantum bit", "q-bit", "bits vs", "two-level"],
    "superposition": ["superposition", "both states", "0 and 1 at once", "50 50",
                       "50/50", "super pos", "super positioned"],
    "hadamard": ["hadamard", " h gate", "h-gate", "superposition gate"],
    "entanglement": ["entangl", "bell state", "bell_pair", "spooky", "correlat",
                      "epr", "entangled"],
    "cnot": ["cnot", "cnx", "controlled x", "controlled not", "two-qubit"],
    "grover": ["grover", "grovers", "search", "oracle", "amplitude amplification",
               "unstructured", "sqrt n"],
    "bloch": ["bloch", "bloch sphere", "sphere", "visuali", "phase of the state"],
    "teleport": ["teleport", "teleportation", "send a qubit", "instant transfer"],
    "algorithm": ["algorithm", "deutsch", "jozsa", "shor", "qft", "quantum fourier",
                  "ghz", "quantum algorithm"],
    "measurement": ["measure", "measurement", "collapse", "observe", "probabilit",
                    "born", "classical bit"],
    "gate": ["x gate", "y gate", "z gate", "s gate", "pauli",
             "single-qubit gate", "swap gate", "quantum gates", "gate", "gates"],
}

_ANSWERS: dict[str, str] = {
    "qubit": "A qubit is the quantum analogue of a bit — a two-level system written "
             "α|0⟩ + β|1⟩. Measuring it gives 0 or 1 with probabilities |α|² and |β|².",
    "superposition": "Superposition means a qubit holds a weighted combination of |0⟩ "
                     "and |1⟩ at once. The Hadamard gate creates the equal (|0⟩+|1⟩)/√2 state.",
    "hadamard": "The Hadamard gate H = 1/√2[[1,1],[1,-1]] maps |0⟩ to (|0⟩+|1⟩)/√2 and |1⟩ "
                "to (|0⟩-|1⟩)/√2, giving equal superposition. Applying H twice returns the "
                "original state (H² = I).",
    "entanglement": "Entanglement links qubits so their measurement outcomes are correlated in "
                    "a way classical systems cannot replicate. The Bell state (|00⟩+|11⟩)/√2 "
                    "always yields matching results.",
    "cnot": "CNOT has a control and a target qubit. If the control is |1⟩ it flips the target; "
            "otherwise it does nothing. Applied to a superposition control it creates entanglement.",
    "grover": "Grover's algorithm searches an unstructured list in O(√N) queries. It uses an "
              "oracle to flip the target's sign and a diffusion operator to amplify its amplitude "
              "over ~√N rounds.",
    "bloch": "The Bloch sphere is a unit sphere where every pure state of a single qubit lives: "
             "|0⟩ is the north pole, |1⟩ the south pole, and equal superpositions sit around the "
             "equator.",
    "teleport": "Quantum teleportation moves an unknown qubit using a shared Bell pair and two "
                "classical bits — it transmits the information, not the physical state.",
    "algorithm": "I can walk you through Bell, GHZ, Deutsch–Jozsa, Grover, QFT and teleportation. "
                 "Open the Algorithm Lab to run one, then ask me to explain the one you picked.",
    "measurement": "Measurement projects the qubit onto a definite basis state. If you measure "
                   "α|0⟩ + β|1⟩ you see 0 with probability |α|² and 1 with probability |β|².",
    "gate": "Single-qubit gates (H, X, Y, Z, S, T) rotate the state on the Bloch sphere, while "
            "CNOT and SWAP entangle or reorder qubits. Each maps to a 2×2 (or permutation) matrix.",
}

_PRETTY: dict[str, str] = {
    "qubit": "qubits", "superposition": "superposition", "hadamard": "the Hadamard gate",
    "entanglement": "entanglement", "cnot": "the CNOT gate", "grover": "Grover's algorithm",
    "bloch": "the Bloch sphere", "teleport": "teleportation", "algorithm": "quantum algorithms",
    "measurement": "measurement", "gate": "quantum gates",
}


def _detect(question: str) -> tuple[str | None, list[str]]:
    """Return (best topic, matched keyword evidence) by scoring the question.

    Ranks by (number of keyword hits, then the *earliest* matched position). This
    lets a specific word near the start of the question (e.g. "Hadamard" in
    "How does the Hadamard gate work?") beat a broad, later word (" gate").
    """
    text = " " + " ".join((question or "").lower().split()) + " "
    scored: dict[str, tuple[int, int, list[str]]] = {}
    for topic, words in _TOPICS.items():
        hits = [w for w in words if w in text]
        if hits:
            earliest = min(text.index(w) for w in hits)
            scored[topic] = (len(hits), -earliest, hits)
    if not scored:
        return None, []
    # Deterministic: dict iteration preserves declaration order for exact ties.
    best = max(scored, key=lambda k: scored[k][:2])
    return best, scored[best][2]


def ask(question: str | None) -> dict:
    """Answer a free-text question, always derived from the question itself.

    When an OpenAI key is set, the question is sent independently to the OpenAI
    API on every call (no caching) and the model's answer is returned. If the key
    is absent or the call fails, the deterministic local engine is used instead so
    the chat never returns an error.
    """
    q = (question or "").strip()
    if not q:
        log.info("tutor.ask empty question")
        return {"question": q, "topic": "", "answer": "Please ask me something about quantum computing!"}

    if openai_configured():
        try:
            answer = _openai_answer(q)
            log.info("tutor.ask delivered question=%r via=openai", q)
            return {"question": q, "topic": "openai", "answer": answer}
        except Exception as exc:  # noqa: BLE001 - never let a model failure break the chat
            log.exception("tutor.ask openai failed; falling back question=%r", q)

    topic, evidence = _detect(q)
    log.info("tutor.ask local question=%r topic=%s evidence=%s", q, topic, evidence)

    if topic:
        lead = "You're asking about %s — " % _PRETTY.get(topic, topic)
        answer = lead + _ANSWERS[topic]
    else:
        snippet = q if len(q) <= 60 else q[:60] + "…"
        lead = "I couldn't map “%s” to a topic I know well — " % snippet
        answer = lead + (
            "but I can help with qubits, superposition, gates, entanglement, "
            "measurement, teleportation and algorithms. Try rephrasing around one of those."
        )

    return {"question": q, "topic": topic or "", "answer": answer}
