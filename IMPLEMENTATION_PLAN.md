# Quantum Learning Platform — Implementation Plan

A web-based, interactive platform for learning quantum algorithms by building and
simulating quantum circuits, with a **Quantum Time Machine** to visualize the
state of the circuit after every gate.

> Scope for this milestone: **project structure + plan only.** The app is built
> incrementally in phases. No phase should be marked complete until it can be
> verified end-to-end.

---

## 1. Goals & MVP Scope

### MVP (must ship)
- Build a small circuit using three basic gates: **H** (Hadamard), **X** (Pauli-X),
  **CNOT** (controlled-X).
- Simulate the circuit using **Qiskit Aer** (the `AerSimulator`).
- Display **measurement results** as a histogram/counts.
- **Quantum Time Machine:** step through the circuit one gate at a time and show
  the full quantum state (amplitudes / probability distribution) after each gate.

### Explicitly deferred (later phases)
- Additional gates (T, S, Rx/Ry/Rz, SWAP, Toffoli), multiple wires/registers,
- Quantum algorithm presets (Bell, GHZ, Deutsch-Jozsa, Grover, QFT),
- User accounts / circuit persistence, circuit history,
- GPU acceleration, save/share circuits, and built-in AI explanations.

---

## 2. Technology Stack (with rationale)

| Layer      | Choice                                                          | Why |
|------------|-----------------------------------------------------------------|-----|
| Backend    | Python 3.12 + **FastAPI** + **UVicorn**                          | User requirement; async, auto docs, pydantic validation |
| Simulator  | **Qiskit 1.x** + **Qiskit Aer**                                  | User requirement; industry standard, Aer for statevector + sampling |
| Frontend   | **Vanilla HTML / CSS / JavaScript** (no build step)              | `node`/`npm` are **not installed** in this environment, so React/Vue+Vite is not viable. Static assets are served directly by FastAPI. |
| HTTP model | JSON REST API                                                    | Simple, testable via the browser or curl |

> **Environment fact (verified):** Python 3.12.10 + pip 25.0.1 are present.
> Qiskit is **not** installed yet (Phase 1 installs it). Node/npm are absent,
> which is why the frontend is build-less.

---

## 3. Project Structure

```
GOAT/
├── IMPLEMENTATION_PLAN.md         # this file
├── README.md                      # run / usage instructions
├── requirements.txt               # backend Python dependencies
├── backend/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app: serves frontend + API routes
│   ├── models.py                  # Pydantic request/response schemas
│   └── quantum/
│       ├── __init__.py
│       ├── simulator.py           # build circuit + run Aer simulator
│       └── time_machine.py        # statevector after each gate
└── frontend/
    ├── index.html                 # UI: circuit palette, canvas, results panel
    ├── css/
    │   └── style.css              # clean, modern styling
    └── js/
        ├── circuitBuilder.js      # add/remove/reorder gates, draw circuit
        ├── simulator.js           # POST to backend, render measurement counts
        └── timeMachine.js         # step-through state visualization
```

---

## 4. API Contract

### `POST /api/simulate`
Runs the circuit and returns measurement counts.

Request:
```json
{
  "qubits": 2,
  "shots": 1024,
  "gates": [
    {"type": "h",  "qubits": [0]},
    {"type": "cx", "qubits": [0, 1]}
  ]
}
```
- `type` is one of `"h" | "x" | "cx"`.
- `h`/`x` use `qubits[0]` as the target; `cx` uses `qubits[0]` as control and `qubits[1]` as target.
- `shots` defaults to `1024` (clamped to `1..100000`).

Response:
```json
{
  "counts": {"00": 512, "11": 512},
  "statevector": ["0.7071", "-0.7071", "0", "0"],
  "appliedGates": ["H", "CNOT"]
}
```

### `POST /api/time-machine`
Returns the full state (amplitudes) **after each gate**, in order.

Request: same shape as `/api/simulate` (without `shots`).

Response:
```json
{
  "qubits": 2,
  "steps": [
    {"label": "initial", "amplitudes": ["1", "0", "0", "0"]},
    {"label": "H",  "amplitudes": ["0.7071", "0.7071", "0", "0"]},
    {"label": "CNOT", "amplitudes": ["0.7071", "0", "0", "0.7071"]}
  ]
}
```
Amplitudes are ordered by little-endian bit string (`|0⟩..|2ⁿ-1⟩`), matching Qiskit's
`Statevector` layout. Amplitudes are complex numbers formatted as strings.

### `GET /api/health`
```json
{"status": "ok", "qiskit": "1.x.y", "aer": "0.x.y"}
```
Used by the frontend "backend status" indicator.

---

## 5. Data Model (`backend/models.py`)

```python
class Gate(BaseModel):
    type: Literal["h", "x", "cx"]
    qubits: list[int]          # [target] for h/x; [control, target] for cx

class SimulateRequest(BaseModel):
    qubits: int = Field(2, ge=1, le=4)   # keep n small so statevector stays readable
    shots: int = Field(1024, ge=1, le=100000)
    gates: list[Gate] = []

class SimulateResponse(BaseModel):
    counts: dict[str, int]
    statevector: list[str]
    appliedGates: list[str]

class TimeMachineRequest(BaseModel):
    qubits: int = Field(2, ge=1, le=4)
    gates: list[Gate] = []

class TimeMachineResponse(BaseModel):
    qubits: int
    steps: list[TimeMachineStep]
```

---

## 6. Quantum Backend Design

### `backend/quantum/simulator.py`
- `build_circuit(qubits: int, gates: list[Gate]) -> QuantumCircuit`
  - Create an `n`-qubit circuit; apply each gate:
    - `"h"` → `circuit.h(q0)`
    - `"x"` → `circuit.x(q0)`
    - `"cx"` → `circuit.cx(control, target)`
- `simulate(query: SimulateRequest) -> SimulateResponse`
  - Attach `AerSimulator()`; add `save_statevector()`; run; extract counts and final amplitudes.
  - Validate qubit indices are in range, else raise a `400`-mapped `ValueError`.

### `backend/quantum/time_machine.py`
- `stepwise_states(query: TimeMachineRequest) -> TimeMachineResponse`
  - Start from the `|0..0⟩` state.
  - For each gate: apply it to a working circuit, compute the resulting
    `Statevector`, record its amplitudes. The first entry is the **initial** state
    before any gate.
  - Use Qiskit's `quantum_info.Statevector` or a statevector `AerSimulator` run per step.

### Gate → human label mapping
`{"h": "H", "x": "X", "cx": "CNOT"}` for display in the time machine.

---

## 7. Frontend Design (vanilla JS)

- **Palette** with buttons for **H**, **X**, **CNOT**. Clicking a gate appends it to
  the gate list; a target-qubit selector (for H/X) and control/target selectors
  (for CNOT) let the user pick wires.
- **Circuit canvas**: renders wires and gate boxes; supports removing the last gate
  and clearing. Gate order is the execution order.
- **Run** button → `POST /api/simulate` → renders a **counts histogram** (bars + counts).
- **Quantum Time Machine** panel → `POST /api/time-machine` → a **play/pause/step**
  control that walks through each `step`, drawing the amplitude/probability bars for
  every basis state, with the current gate label shown.
- A small **status badge** pings `GET /api/health` on load.

### State module pattern
A single `appState` object holds `qubits` and `gates[]`; DOM rendering is a few pure
functions (`renderCircuit`, `renderCounts`, `renderTimeStep`) that read from it. No
framework, no build step.

---

## 8. Phased Implementation Plan

Each phase is a shippable vertical slice. **Do not start a phase until the previous
phase's accept criteria are met.**

### Phase 1 — Backend skeleton + Qiskit simulation (core)
- [ ] `pip install qiskit qiskit-aer fastapi uvicorn`
- [ ] `backend/models.py`, `backend/quantum/simulator.py` (build + Aer run)
- [ ] `backend/main.py`: `POST /api/simulate`, `GET /api/health`, mount `frontend/`
- [ ] **Accept:** `curl -X POST /api/simulate` with an H+H/CNOT circuit returns
      correct counts (e.g., `{"00":~256,"11":~256}` after `H`+`CNOT`).

### Phase 2 — Time Machine backend
- [ ] `backend/quantum/time_machine.py` (statevector after each gate)
- [ ] `POST /api/time-machine` returns ordered `steps`
- [ ] **Accept:** time-machine response has `qubits+1` steps, each with `2^qubits`
      amplitudes; Bell circuit shows `|00⟩` → `|+0⟩` → `|Bell⟩`.

### Phase 3 — Frontend circuit builder
- [ ] `frontend/index.html` + `css/style.css`: palette, wire/gate canvas, results panel
- [ ] `js/circuitBuilder.js`: add/remove gates, wire selectors, render circuit
- [ ] **Accept:** user can add H/X/CNOT, choose wires, and see the circuit redraw.

### Phase 4 — Simulation display + Time Machine UI
- [ ] `js/simulator.js`: call `/api/simulate`, render counts histogram
- [ ] `js/timeMachine.js`: call `/api/time-machine`, play/pause/step rendering
- [ ] `js/` status badge → `/api/health`
- [ ] **Accept:** full loop works — build → run → counts; step through time machine.

### Phase 5 — Polish & correctness
- [ ] Error handling for invalid qubit indices / missing gates (400 responses)
- [ ] Amplitude formatting, responsive styling, accessibility (keyboard/ARIA)
- [ ] README run instructions finalised
- [ ] **Accept:** manual test script passes; all endpoints documented.

### Phase 6+ — Advanced (deferred)
- Add gates (T, S, Rx/Ry/Rz, SWAP, Toffoli); algorithm presets; circuit save/share;
  AI explanations per gate.

---

## 9. Run Instructions (target, once Phases 1–4 are done)

```bash
cd GOAT
python -m pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
# open http://127.0.0.1:8000
```

FastAPI serves the static frontend from `frontend/` and exposes the simulation APIs.

---

## 10. Open Questions / Assumptions
- Max qubits capped at **4** for the MVP so the time-machine state stays readable
  (amplitudes grow as `2^n`). Easily raised later.
- `shots` default `1024`. Measurement histogram uses Qiskit's sampled counts, not
  the exact probabilities.
- The frontend is intentionally framework-free because Node is unavailable here.
  If Node later becomes available, a Vite+React migration is possible without
  touching the backend API.
