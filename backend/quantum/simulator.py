"""Build quantum circuits and run them on the Qiskit Aer simulator.

Supported gates:
    * ``h``  — Hadamard, creates superposition
    * ``x``  — Pauli-X (NOT), flips |0> <-> |1>
    * ``y``  — Pauli-Y, flips with a phase
    * ``z``  — Pauli-Z, applies a relative phase of -1 to |1>
    * ``s``  — S-gate (sqrt of Z), quarter-turn phase
    * ``t``  — T-gate (4th root of Z)
    * ``cx`` — controlled-X (CNOT), flips target if the control is |1>
    * ``swap`` — exchanges two qubits
    * ``id`` — identity (no-op)
    * ``measure`` — measurement into a classical register (one classic bit per qubit)
"""

from __future__ import annotations

from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

# Gate id -> display label (also used by the Time Machine).
GATE_LABELS: dict[str, str] = {
    "h": "H",
    "x": "X",
    "y": "Y",
    "z": "Z",
    "s": "S",
    "t": "T",
    "cx": "CNOT",
    "swap": "SWAP",
    "id": "I",
    "measure": "M",
}

# Aer's built-in simulator.
_SIMULATOR = AerSimulator()

_SINGLE_GATES = {"h", "x", "y", "z", "s", "t", "id", "measure"}


def _gate_error(gate_type: str) -> str:
    return (
        f"Unsupported gate type: {gate_type!r} "
        f"(supported: h, x, y, z, s, t, cx, swap, id, measure)"
    )


def _qubit_error(idx: int, n: int) -> str:
    return f"Qubit index {idx} is out of range for an {n}-qubit circuit"


def build_circuit(qubits: int, gates: list) -> QuantumCircuit:
    """Create an ``n``-qubit circuit and apply the given gates in order.

    ``gates`` is a list of ``backend.models.Gate`` objects. Raises ``ValueError``
    on a bad gate type or an out-of-range qubit index.
    """
    # Create a classical register (one bit per qubit) up front so explicit
    # ``measure`` operations can write into a valid classical bit — otherwise
    # ``qc.measure(qubit, bit)`` raises "Index 0 out of range for size 0".
    qc = QuantumCircuit(qubits, qubits, name="circuit")

    for gate in gates:
        gtype = gate.type
        qs = gate.qubits

        if gtype in _SINGLE_GATES:
            _check_single(qs, qubits, gtype)
            if gtype == "h":
                qc.h(qs[0])
            elif gtype == "x":
                qc.x(qs[0])
            elif gtype == "y":
                qc.y(qs[0])
            elif gtype == "z":
                qc.z(qs[0])
            elif gtype == "s":
                qc.s(qs[0])
            elif gtype == "t":
                qc.t(qs[0])
            elif gtype == "id":
                qc.id(qs[0])
            elif gtype == "measure":
                qc.measure(qs[0], qs[0])
        elif gtype == "cx":
            _check_pair(qs, qubits)
            qc.cx(qs[0], qs[1])
        elif gtype == "swap":
            _check_pair(qs, qubits)
            qc.swap(qs[0], qs[1])
        else:
            raise ValueError(_gate_error(gtype))

    return qc


def _check_single(qs: list, n: int, name: str) -> None:
    if len(qs) != 1:
        raise ValueError(f"Gate {name!r} expects exactly one target qubit")
    if not (0 <= qs[0] < n):
        raise ValueError(_qubit_error(qs[0], n))


def _check_pair(qs: list, n: int) -> None:
    if len(qs) != 2:
        raise ValueError("Gate expects two qubits, e.g. [control, target] or [a, b]")
    for q in qs:
        if not (0 <= q < n):
            raise ValueError(_qubit_error(q, n))


def format_amplitude(value: complex, decimals: int = 4) -> str:
    """Return a compact string for a (typically real) complex amplitude."""
    real = round(value.real, decimals)
    imag = round(value.imag, decimals)

    if abs(imag) < 1e-12:
        return _fmt(real)

    sign = "+" if imag >= 0 else "-"
    return f"{_fmt(real)}{sign}{_fmt(abs(imag))}i"


def _fmt(x: float) -> str:
    """Round and strip a float to a short, readable string."""
    if abs(x) < 1e-12:
        x = 0.0
    s = f"{x:.4f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s if s not in ("-0", "") else "0"


def simulate(request) -> dict:
    """Run the circuit on Aer and return counts + final amplitudes + labels."""
    n = request.qubits
    qc = build_circuit(n, request.gates)
    # Reuse the existing classical register (``add_bits=False``) so counts use a
    # single register and produce clean length-``n`` labels instead of doubling.
    qc.measure_all(add_bits=False)

    result = _SIMULATOR.run(qc, shots=request.shots, seed_simulator=42).result()
    counts = result.get_counts(qc)

    # Re-run without measurement to inspect the final amplitudes.
    qc2 = build_circuit(n, request.gates)
    qc2.save_statevector()
    state = _SIMULATOR.run(qc2, shots=1).result().get_statevector(qc2)

    amplitudes = [format_amplitude(state[i]) for i in range(2**n)]
    probs = [float(abs(state[i]) ** 2) for i in range(2**n)]
    total = sum(probs) or 1.0
    probs = [p / total for p in probs]
    applied = [GATE_LABELS[g.type] for g in request.gates]

    return {
        "counts": counts,
        "statevector": amplitudes,
        "probabilities": probs,
        "appliedGates": applied,
    }


def probability_map(qubits: int, gates: list) -> list[float]:
    """Return the measurement probability for each basis state (little-endian)."""
    qc = build_circuit(qubits, gates)
    qc.save_statevector()
    state = _SIMULATOR.run(qc, shots=1).result().get_statevector(qc)
    probs = [float(abs(state[i]) ** 2) for i in range(2**qubits)]
    total = sum(probs) or 1.0
    return [p / total for p in probs]


def basis_labels(n: int) -> list[str]:
    """Little-endian basis labels, e.g. n=2 -> ['00', '01', '10', '11']."""
    return [format(i, f"0{n}b") for i in range(2**n)]
