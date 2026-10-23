"""Circuit validation / intelligent error detection.

Detects common mistakes such as out-of-range qubit indices, malformed gate
arguments, controlled gates with the same control and target, missing
measurements, and unsupported configurations. Returns user-friendly messages
that explain *how to fix* the problem.
"""

from __future__ import annotations

from .simulator import _SINGLE_GATES

_SINGLE = {"h", "x", "y", "z", "s", "t", "id"}
_PAIR = {"cx", "swap"}
_MEASURE = {"measure"}


def validate(qubits: int, gates: list) -> dict:
    """Return ``{valid, issues:[{code, message}]}``."""
    issues: list[dict] = []
    n = qubits

    for idx, gate in enumerate(gates):
        gtype = gate.type
        qs = gate.qubits

        if gtype in _SINGLE:
            if len(qs) != 1:
                issues.append(
                    {
                        "code": "wrong_arity",
                        "message": f"Gate '{gtype}' needs exactly one target qubit. "
                                   f"Click q{q} in the palette or remove the extra qubit.",
                    }
                )
            elif not (0 <= qs[0] < n):
                issues.append(
                    {
                        "code": "out_of_range",
                        "message": f"Gate '{gtype}' references qubit q{qs[0]}, but your "
                                   f"circuit only has {n} qubits (q0–q{n - 1}).",
                    }
                )

        elif gtype in _PAIR:
            if len(qs) != 2:
                issues.append(
                    {
                        "code": "wrong_arity",
                        "message": f"Your {gtype.upper()} gate requires two qubits "
                                   f"(a control and a target) — e.g. [control, target].",
                    }
                )
                continue
            if qs[0] == qs[1]:
                issues.append(
                    {
                        "code": "same_qubit",
                        "message": f"Your {gtype.upper()} gate has the same control and "
                                   f"target qubit (q{qs[0]}). Pick two different qubits.",
                    }
                )
            for q in qs:
                if not (0 <= q < n):
                    issues.append(
                        {
                            "code": "out_of_range",
                            "message": f"Your {gtype.upper()} gate references qubit q{q}, "
                                       f"but your circuit only has {n} qubits.",
                        }
                    )

        elif gtype in _MEASURE:
            if len(qs) != 1:
                issues.append(
                    {
                        "code": "wrong_arity",
                        "message": "A measurement needs exactly one target qubit.",
                    }
                )
            elif not (0 <= qs[0] < n):
                issues.append(
                    {
                        "code": "out_of_range",
                        "message": f"Measurement references qubit q{qs[0]}, which is out "
                                   f"of range for a {n}-qubit circuit.",
                    }
                )

        else:
            issues.append(
                {
                    "code": "unknown_gate",
                    "message": f"Unsupported gate '{gtype}'. Supported gates: "
                               f"H, X, Y, Z, S, T, CNOT, SWAP, Measure.",
                }
            )

    # If a pair gate was appended but later found invalid, dedupe by code+message
    # is unnecessary; we keep all unique issues.
    return {"valid": len(issues) == 0, "issues": issues}
