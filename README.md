# Green Quanta - AI Quantum Learning Platform
# Green Quanta – AI Quantum Learning Platform

🚀 **Live Demo:** https://green-quanta-ai-sigj.onrender.com

An interactive web app for learning quantum algorithms by building and simulating
quantum circuits with **Qiskit Aer**, visualizing the measurement outcome
distribution, stepping through the state evolution **after every gate** (the
"Quantum Time Machine"), and reading a built-in **AI Tutor** explanation.

## Features

- **Build a circuit** from three basic gates: **H** (Hadamard), **X** (Pauli-X),
  and **CNOT** (controlled-X), on 1–4 qubits.
- **Simulate** with the Qiskit `AerSimulator` and see the measurement histogram
  plus the final statevector.
- **Quantum Time Machine** — replay the circuit one gate at a time and watch the
  amplitude / probability bars change after every gate.
- **AI Tutor** — a local, rule-based explanation of what each gate does, what the
  final state means, and what to try next.

## Prerequisites

- **Python 3.12** (verified: `python --version` → `3.12.10`)
- `pip` (`pip --version` → `25.0.1`)
- Qiskit, Qiskit Aer, FastAPI, Uvicorn (installed via `requirements.txt`)
- No Node/npm required — the frontend is static HTML/CSS/JS.

## Project Structure

```
GOAT/
├── README.md
├── requirements.txt
├── backend/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app: frontend + API routes
│   ├── models.py                  # Pydantic request/response schemas
│   └── quantum/
│       ├── __init__.py
│       ├── simulator.py           # build circuit + run Aer simulator
│       ├── time_machine.py        # statevector after each gate
│       └── tutor.py               # AI Tutor explanation engine
└── frontend/
    ├── index.html                 # UI: palette, circuit, results, time machine, tutor
    ├── css/style.css
    └── js/
        ├── circuitBuilder.js      # add/remove gates, render circuit
        ├── simulator.js           # /api/simulate → counts histogram
        ├── timeMachine.js         # /api/time-machine → step-through view
        ├── tutor.js               # /api/tutor → explanation
        └── main.js                # wiring + backend health badge
```

## Run

```bash
cd GOAT
python -m pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Then open **http://127.0.0.1:8000** in a browser.

## API

| Method | Path              | Body / purpose                                              |
|--------|-------------------|-------------------------------------------------------------|
| POST   | `/api/simulate`   | `{qubits, shots, gates}` → counts + final statevector       |
| POST   | `/api/time-machine` | `{qubits, gates}` → ordered per-gate states                |
| POST   | `/api/tutor`      | `{qubits, gates}` → structured explanation                  |
| GET    | `/api/health`     | `{status, qiskit, aer}`                                     |

Example `/api/simulate` body (Bell state):

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

## Notes

- Qubit count is capped at **4** so the statevector stays readable.
- Measurement counts are sampled (default 1024 shots); amplitude probabilities are
  computed exactly from the final statevector.
- Statevectors use Qiskit's little-endian basis ordering (`|0…0⟩` … `|1…1⟩`).
