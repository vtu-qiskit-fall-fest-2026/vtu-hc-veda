"""Pydantic request/response schemas for the GREEN QUANTA backend.

All schemas are shared by the FastAPI routes defined in ``main.py`` and the
quantum backend modules in ``backend/quantum``.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# Allowed gate types. ``h|y|z|s|t`` act on a single target qubit; ``cx``
# (controlled-X / CNOT) acts on a control and a target; ``swap`` exchanges two
# qubits; ``measure`` performs a measurement (kept simple, no classical register).
GateType = Literal[
    "h", "x", "y", "z", "s", "t", "cx", "swap", "id", "measure"
]


class Gate(BaseModel):
    """A single gate applied to one or two qubits."""

    type: GateType
    # h/x/y/z/s/t/id/measure -> [target]; cx -> [control, target]; swap -> [a, b]
    qubits: list[int] = Field(default_factory=list)


class SimulateRequest(BaseModel):
    """Request body for ``POST /api/simulate``."""

    qubits: int = Field(default=2, ge=1, le=5)
    shots: int = Field(default=1024, ge=1, le=100000)
    gates: list[Gate] = Field(default_factory=list)


class SimulateResponse(BaseModel):
    """Measurement counts plus the final amplitudes."""

    counts: dict[str, int]
    statevector: list[str]
    probabilities: list[float]
    appliedGates: list[str]


class TimeMachineRequest(BaseModel):
    """Request body for ``POST /api/time-machine``."""

    qubits: int = Field(default=2, ge=1, le=5)
    gates: list[Gate] = Field(default_factory=list)


class TimeMachineStep(BaseModel):
    """The quantum state (amplitudes + probabilities) after one gate."""

    label: str
    amplitudes: list[str]
    probabilities: list[float]


class TimeMachineResponse(BaseModel):
    """Ordered list of states: index 0 is the initial pre-gate state."""

    qubits: int
    steps: list[TimeMachineStep]


class TutorRequest(BaseModel):
    """Request body for ``POST /api/tutor`` (AI Tutor explanation)."""

    qubits: int = Field(default=2, ge=1, le=5)
    gates: list[Gate] = Field(default_factory=list)
    question: str | None = None


class TutorResponse(BaseModel):
    """A rule-based, human-readable explanation of the circuit."""

    title: str
    summary: str
    gateExplanations: list[str]
    interpretation: str
    tips: list[str]


class AskRequest(BaseModel):
    """Body for ``POST /api/ask`` (free-text AI tutor question)."""

    question: str = Field(min_length=1)


class AskResponse(BaseModel):
    """The tutor's answer, generated specifically for the question asked."""

    question: str
    topic: str
    answer: str


class AlgorithmRequest(BaseModel):
    """Body for the algorithm-preset endpoint."""

    algorithm: Literal["bell", "ghz", "deutsch-jozsa", "grover", "qft", "teleport"]
    shots: int = Field(default=4096, ge=1, le=100000)


class AlgorithmResponse(BaseModel):
    """Result of running a preset algorithm."""

    algorithm: str
    name: str
    qubits: int
    gates: list[Gate]
    counts: dict[str, int]
    probabilities: list[float]
    explanation: str


class ValidationRequest(BaseModel):
    """Body for the circuit-validation endpoint."""

    qubits: int = Field(default=2, ge=1, le=5)
    gates: list[Gate] = Field(default_factory=list)


class ValidationIssue(BaseModel):
    """One detected problem with a circuit."""

    code: str
    message: str


class ValidationResponse(BaseModel):
    """The result of validating a circuit before running it."""

    valid: bool
    issues: list[ValidationIssue]
