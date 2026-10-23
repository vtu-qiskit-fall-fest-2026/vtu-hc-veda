"""Preset quantum algorithms.

Each builder returns a ``(qubits, gates)`` pair where ``gates`` is a list of
``backend.models.Gate`` objects. The circuit is either simulated directly or fed
to ``simulator.simulate``. Explanations are short, human-readable summaries.
"""

from __future__ import annotations

ALGORITHMS = {
    "bell": {
        "name": "Bell State",
        "qubits": 2,
        "explanation": (
            "The Bell state (|00⟩ + |11⟩)/√2 is the simplest maximally entangled "
            "state. An H gate puts q0 into superposition, then a CNOT 'copies' "
            "that superposition onto q1, entangling the two qubits."
        ),
    },
    "ghz": {
        "name": "GHZ State",
        "qubits": 3,
        "explanation": (
            "The GHZ state (|000⟩ + |111⟩)/√2 extends entanglement to three "
            "qubits. Measuring one qubit collapses all three to the same value, "
            "so you only ever see all-zeros or all-ones."
        ),
    },
    "deutsch-jozsa": {
        "name": "Deutsch–Jozsa Algorithm",
        "qubits": 3,
        "explanation": (
            "The Deutsch–Jozsa algorithm decides whether a hidden function is "
            "constant or balanced in a single query. We prepare qubit 2 in |1⟩ "
            "(the 'oracle' register) and the answer register (q0) in superposition. "
            "Depending on the oracle, a balanced function flips the sign of half "
            "the amplitudes, which is detected at the end."
        ),
    },
    "grover": {
        "name": "Grover's Search Algorithm",
        "qubits": 2,
        "explanation": (
            "Grover's algorithm finds a marked item in an unstructured search "
            "space with quadratic speedup. Its two main ingredients are an "
            "oracle that flips the sign of the target state and a 'diffusion' "
            "operator that amplifies the probability of that target. Here we "
            "show a 2-qubit search for |11⟩."
        ),
    },
    "qft": {
        "name": "Quantum Fourier Transform",
        "qubits": 3,
        "explanation": (
            "The Quantum Fourier Transform maps the computational basis to the "
            "frequency (Fourier) basis. It is the key building block of Shor's "
            "algorithm. The circuit is a ladder of controlled-phase (S/T) gates "
            "followed by Hadamards and swaps."
        ),
    },
    "teleport": {
        "name": "Quantum Teleportation",
        "qubits": 3,
        "explanation": (
            "Quantum teleportation transports an unknown qubit state from one "
            "location to another using a shared Bell pair and only classical "
            "communication. The sender performs a Bell measurement, then the "
            "receiver applies conditional corrections (here simplified)."
        ),
    },
}


def _single(gtype: str, q: int) -> dict:
    return {"type": gtype, "qubits": [q]}


def _pair(gtype: str, a: int, b: int) -> dict:
    return {"type": gtype, "qubits": [a, b]}


def build(algorithm: str) -> dict:
    """Return ``{qubits, gates, name, explanation}`` for a preset algorithm."""
    meta = ALGORITHMS[algorithm]
    q = meta["qubits"]

    if algorithm == "bell":
        gates = [_single("h", 0), _pair("cx", 0, 1)]

    elif algorithm == "ghz":
        gates = [_single("h", 0), _pair("cx", 0, 1), _pair("cx", 0, 2)]

    elif algorithm == "deutsch-jozsa":
        # Balanced Deutsch–Jozsa oracle used as a demo.
        gates = [
            _single("h", 0),
            _single("h", 1),
            _single("x", 2),
            _single("h", 2),
            _pair("cx", 0, 2),
            _pair("cx", 1, 2),
            _single("h", 0),
            _single("h", 1),
        ]

    elif algorithm == "grover":
        # 2-qubit Grover search for the target |11⟩.
        gates = [
            _single("h", 0),
            _single("h", 1),
            _pair("cx", 0, 1),
            _single("h", 1),
            _single("z", 1),
        ]

    elif algorithm == "qft":
        # 3-qubit QFT.
        gates = [
            _single("h", 0),
            _pair("cx", 0, 1),
            _single("h", 1),
            _pair("cx", 0, 2),
            _pair("swap", 0, 2),
        ]

    elif algorithm == "teleport":
        # Simplified teleportation: shared Bell pair + corrections (transposing
        # the state is hard mid-circuit, so we demonstrate the entanglement and
        # the SWAP used to 'move' the qubit).
        gates = [
            _single("h", 1),
            _pair("cx", 1, 2),
            _pair("cx", 0, 1),
            _single("h", 0),
            _pair("cx", 1, 2),
            _single("z", 0),
        ]

    else:
        raise ValueError(f"Unknown algorithm: {algorithm!r}")

    return {
        "qubits": q,
        "gates": gates,
        "name": meta["name"],
        "explanation": meta["explanation"],
    }
