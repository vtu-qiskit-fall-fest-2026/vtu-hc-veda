"""Quantum Learning Platform — FastAPI application.

Serves the static frontend from ``frontend/`` and exposes the simulation,
Time Machine, and AI Tutor APIs.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("greenquanta")
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import db
import models
from quantum import algorithms, simulator, time_machine, tutor, validation


# Paths --------------------------------------------------------------------
_BACKEND_DIR = Path(__file__).resolve().parent
_FRONTEND_DIR = _BACKEND_DIR.parent / "frontend"

app = FastAPI(
    title="Quantum Learning Platform",
    description="Build quantum circuits, simulate them with Qiskit Aer, and "
    "step through the quantum state after every gate.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data / auth routes (Supabase-backed). All are safe when Supabase is not yet
# configured — they return 503 with a clear, actionable message.
app.include_router(db.router)


@app.on_event("startup")
def _startup_db():
    # Best-effort schema creation when a Postgres connection string is available.
    # If SUPABASE_DB_URL is absent, the user runs the schema in the SQL editor.
    try:
        db.run_migration()
    except Exception as exc:  # noqa: BLE001
        print(f"[db] Schema migration skipped: {exc}")


# Error-mapping helper -----------------------------------------------------
def _run(fn, *args):
    """Run a quantum backend call and map ``ValueError`` to HTTP 400."""
    try:
        return fn(*args)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# API routes ---------------------------------------------------------------
@app.get("/api/health")
def health():
    import qiskit
    import qiskit_aer

    return {"status": "ok", "qiskit": qiskit.__version__, "aer": qiskit_aer.__version__}


@app.post("/api/simulate", response_model=models.SimulateResponse)
def simulate(req: models.SimulateRequest):
    return _run(simulator.simulate, req)


@app.post("/api/time-machine", response_model=models.TimeMachineResponse)
def time_machine_endpoint(req: models.TimeMachineRequest):
    return _run(time_machine.stepwise_states, req)


@app.post("/api/tutor", response_model=models.TutorResponse)
def tutor_explain(req: models.TutorRequest):
    return _run(tutor.explain, req)


@app.post("/api/ask", response_model=models.AskResponse)
def tutor_ask(req: models.AskRequest):
    """Answer a free-text AI-tutor question. Always generated from the question.

    The current question is passed straight to the answer engine on every call;
    nothing is cached from a previous one. Includes logging + a clean error path.
    """
    logger.info("tutor.ask question=%r", req.question)
    try:
        return tutor.ask(req.question)
    except Exception as exc:  # noqa: BLE001
        logger.exception("tutor.ask failed question=%r", req.question)
        raise HTTPException(status_code=500, detail="The tutor could not answer that question.") from exc


@app.post("/api/validate", response_model=models.ValidationResponse)
def validate_circuit(req: models.ValidationRequest):
    """Run intelligent circuit validation and return any issues to fix."""
    return validation.validate(req.qubits, req.gates)


@app.post("/api/algorithm", response_model=models.AlgorithmResponse)
def run_algorithm(req: models.AlgorithmRequest):
    """Run a preset quantum algorithm and return counts + explanation."""
    preset = algorithms.build(req.algorithm)
    from .quantum.simulator import build_circuit, GATE_LABELS

    sim_req = models.SimulateRequest(
        qubits=preset["qubits"], shots=req.shots, gates=preset["gates"]
    )
    result = simulator.simulate(sim_req)
    return {
        "algorithm": req.algorithm,
        "name": preset["name"],
        "qubits": preset["qubits"],
        "gates": preset["gates"],
        "counts": result["counts"],
        "probabilities": result["probabilities"],
        "explanation": preset["explanation"],
    }


# Static frontend ----------------------------------------------------------
@app.get("/")
def index():
    index_path = _FRONTEND_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Frontend not built yet.")
    return FileResponse(index_path)


# Mount the frontend asset folders (css, js) so the relative paths used in
# index.html resolve when the app is served by FastAPI. We also keep the
# legacy `/static/...` alias for compatibility.
if _FRONTEND_DIR.exists():
    for sub in ("css", "js"):
        asset_dir = _FRONTEND_DIR / sub
        if asset_dir.exists():
            app.mount(f"/{sub}", StaticFiles(directory=str(asset_dir)), name=sub)
            app.mount(f"/static/{sub}", StaticFiles(directory=str(asset_dir)), name=f"static_{sub}")
