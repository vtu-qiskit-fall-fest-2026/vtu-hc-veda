"""Quantum Time Machine: the full state after every gate.

Walks a circuit gate-by-gate and records the ``Statevector`` amplitudes and
probabilities after each one, starting from the initial ``|0...0>`` state.
"""

from __future__ import annotations

from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

from .simulator import GATE_LABELS, build_circuit, format_amplitude

_SIMULATOR = AerSimulator()


def _state_after(qubits: int, gates: list) -> QuantumCircuit:
    """Build a circuit and attach a statevector snapshot for inspection."""
    qc = build_circuit(qubits, gates)
    qc.save_statevector()
    return qc


def _describe(gate, n: int, index: int) -> str:
    """Human-readable label for one gate, e.g. 'H on q0', 'CNOT(0 -> 1)'."""
    gtype = gate.type
    qs = gate.qubits
    single = {"h", "x", "y", "z", "s", "t", "id", "measure"}
    if gtype in single:
        return f"{GATE_LABELS[gtype]} on q{qs[0]}"
    if gtype == "swap":
        return f"SWAP(q{qs[0]} <-> q{qs[1]})"
    return f"{GATE_LABELS.get(gtype, gtype.upper())}(q{qs[0]} -> q{qs[1]})"


def stepwise_states(request) -> dict:
    """Return the quantum state before and after each gate, in execution order.

    The first entry is always the initial all-zero state; each subsequent entry
    corresponds to one more gate being applied. Amplitudes are formatted strings
    and probabilities are the squared magnitudes.
    """
    n = request.qubits
    gates = request.gates

    steps: list[dict] = []

    # Step 0: the initial state (no gates applied).
    initial = _state_after(n, gates[:0])
    initial_amps = _SIMULATOR.run(initial, shots=1).result().get_statevector(initial)
    steps.append(
        {
            "label": "initial",
            "amplitudes": [format_amplitude(initial_amps[i]) for i in range(2**n)],
            "probabilities": [float(abs(initial_amps[i]) ** 2) for i in range(2**n)],
        }
    )

    # One step per gate.
    for i, gate in enumerate(gates, start=1):
        prefix = gates[:i]
        qc = _state_after(n, prefix)
        amps = _SIMULATOR.run(qc, shots=1).result().get_statevector(qc)
        steps.append(
            {
                "label": _describe(gate, n, i),
                "amplitudes": [format_amplitude(amps[i2]) for i2 in range(2**n)],
                "probabilities": [float(abs(amps[i2]) ** 2) for i2 in range(2**n)],
            }
        )

    return {"qubits": n, "steps": steps}
