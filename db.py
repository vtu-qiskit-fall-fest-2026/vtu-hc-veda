"""Supabase / PostgreSQL integration for GREEN QUANTA.

This module is the single point of contact with a live Supabase project. It:

* Reads configuration exclusively from environment variables (never hardcoded).
* Exposes a FastAPI router with auth + per-user data endpoints.
* Creates the database tables (idempotently) and reconciles the relational
  side-tables (completed lessons, quiz attempts, achievements) from the user's
  progress snapshot.

Security model
--------------
* Auth (signup / login / logout / session validation) is handled by Supabase Auth.
* The frontend sends its Supabase JWT in the ``Authorization`` header.
* Data is scoped strictly by the authenticated user id on every request.
* The service-role client is used only server-side (it is never exposed to the
  browser) and only ever queries rows belonging to the authenticated user.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

# Optional env loader — keep the app importable when python-dotenv is absent.
try:
    from dotenv import load_dotenv

    _ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(_ENV_PATH)
except Exception:  # pragma: no cover - environment dependent
    pass


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #
def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def config() -> dict[str, str]:
    """Return the resolved Supabase config from the environment."""
    return {
        "url": _env("SUPABASE_URL"),
        "anon_key": _env("SUPABASE_ANON_KEY") or _env("SUPABASE_PUBLISHABLE_KEY"),
        "service_role_key": _env("SUPABASE_SERVICE_ROLE_KEY") or _env("SUPABASE_SECRET_KEY"),
        "db_url": _env("SUPABASE_DB_URL"),
    }


def is_configured() -> bool:
    c = config()
    return bool(c["url"] and c["anon_key"] and c["service_role_key"])


class DBNotConfigured(Exception):
    """Raised when a live-database endpoint is hit without credentials."""


_supabase = None
_auth = None
_db_session = None


def _client():
    """Lazily build the service-role Supabase client (cached)."""
    global _supabase
    if _supabase is None:
        if not is_configured():
            raise DBNotConfigured()
        from supabase import create_client

        c = config()
        _supabase = create_client(c["url"], c["service_role_key"])
    return _supabase


def _auth_client():
    """Lazily build the anon-key Supabase client for auth operations (cached)."""
    global _auth
    if _auth is None:
        if not is_configured():
            raise DBNotConfigured()
        from supabase import create_client

        c = config()
        _auth = create_client(c["url"], c["anon_key"])
    return _auth


# --------------------------------------------------------------------------- #
# Schema / migration
# --------------------------------------------------------------------------- #
SCHEMA_SQL = """
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.completed_lessons (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.quiz_attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null,
  title text not null default '',
  score integer not null default 0,
  best integer not null default 0,
  date text not null default ''
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts(user_id);

create table if not exists public.achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.saved_circuits (
  id text not null primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  qubits integer not null default 2,
  gates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists saved_circuits_user_idx on public.saved_circuits(user_id);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Shared learning content (read-only for authenticated users; managed by
-- the service role / SQL editor, never by a client user).
create table if not exists public.lessons (
  id text primary key,
  title text not null default '',
  level text not null default 'beginner',
  content jsonb not null default '{}'::jsonb,
  sort integer not null default 0
);

create table if not exists public.quiz_questions (
  id text primary key,
  quiz_id text not null,
  question text not null default '',
  options jsonb not null default '[]'::jsonb,
  answer text not null default '',
  explanation text not null default '',
  sort integer not null default 0
);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions(quiz_id);

-- Per-user learning history / activity feed.
create table if not exists public.learning_activity (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  t text not null default '',
  kind text not null default '',
  ref text not null default '',
  ts timestamptz not null default now()
);
create index if not exists learning_activity_user_idx on public.learning_activity(user_id);

-- --------------------------------------------------------------------- #
-- Row Level Security + policies. Each user can only touch their own rows.
-- --------------------------------------------------------------------- #
alter table public.profiles enable row level security;
drop policy if exists own_profiles on public.profiles;
create policy own_profiles on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.progress enable row level security;
drop policy if exists own_progress on public.progress;
create policy own_progress on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.completed_lessons enable row level security;
drop policy if exists own_completed_lessons on public.completed_lessons;
create policy own_completed_lessons on public.completed_lessons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.quiz_attempts enable row level security;
drop policy if exists own_quiz_attempts on public.quiz_attempts;
create policy own_quiz_attempts on public.quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.achievements enable row level security;
drop policy if exists own_achievements on public.achievements;
create policy own_achievements on public.achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.saved_circuits enable row level security;
drop policy if exists own_saved_circuits on public.saved_circuits;
create policy own_saved_circuits on public.saved_circuits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.user_settings enable row level security;
drop policy if exists own_user_settings on public.user_settings;
create policy own_user_settings on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.learning_activity enable row level security;
drop policy if exists own_activity on public.learning_activity;
create policy own_activity on public.learning_activity
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shared content: authenticated users may read, but never write.
alter table public.lessons enable row level security;
drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons
  for select to authenticated using (true);

alter table public.quiz_questions enable row level security;
drop policy if exists quiz_questions_read on public.quiz_questions;
create policy quiz_questions_read on public.quiz_questions
  for select to authenticated using (true);
"""


def run_migration() -> None:
    """Create tables if they do not exist.

    Requires ``SUPABASE_DB_URL`` (a Postgres connection string). If it is not
    provided, the caller should instruct the user to run the schema in the
    Supabase SQL editor instead.
    """
    db_url = config()["db_url"]
    if not db_url:
        return
    global _db_session
    if _db_session is None:
        import psycopg2

        _db_session = psycopg2.connect(db_url)
    with _db_session.cursor() as cur:
        cur.execute(SCHEMA_SQL)
    _db_session.commit()


def tables_ready() -> bool:
    """Return True if the key table exists (a cheap, safe connectivity probe)."""
    try:
        res = _client().table("profiles").select("user_id").limit(1).execute()
        return res is not None
    except Exception:
        return False


# --------------------------------------------------------------------------- #
# Achievement thresholds (mirrors frontend/js/data.js ACHIEVEMENTS)
# --------------------------------------------------------------------------- #
ACHIEVEMENTS = [
    ("first-lesson", "lessons", 1),
    ("lesson-5", "lessons", 5),
    ("lessons-10", "lessons", 10),
    ("quiz-pass", "bestScore", 80),
    ("algorithm", "algorithms", 1),
    ("algorithm-3", "algorithms", 3),
    ("circuit", "circuits", 5),
    ("streak-3", "streak", 3),
]


def _metric_value(data: dict[str, Any], metric: str) -> int:
    if metric == "lessons":
        return len(data.get("completedLessons") or [])
    if metric == "bestScore":
        scores = data.get("quizScores") or []
        return max((s.get("best", 0) for s in scores), default=0)
    if metric == "algorithms":
        return len(data.get("algorithmsRun") or [])
    if metric == "circuits":
        return int(data.get("circuitsBuilt", 0) or 0)
    if metric == "streak":
        return int(data.get("streak", 1) or 1)
    return 0


def unlocked_achievements(data: dict[str, Any]) -> list[str]:
    return [aid for aid, metric, threshold in ACHIEVEMENTS if _metric_value(data, metric) >= threshold]


# --------------------------------------------------------------------------- #
# Auth helpers
# --------------------------------------------------------------------------- #
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_user(user: Any, access_token: str = "") -> dict[str, Any]:
    meta = getattr(user, "user_metadata", None) or {}
    return {
        "id": user.id,
        "name": meta.get("name", "") or getattr(user, "name", "") or user.email.split("@")[0],
        "email": user.email,
        "createdAt": getattr(user, "created_at", "") or _now_iso(),
        "access_token": access_token,
    }


def _upsert_profile(client: Any, user: Any, name: str) -> None:
    try:
        client.table("profiles").upsert(
            {"user_id": user.id, "name": name, "email": user.email}
        ).execute()
    except Exception:
        # Non-fatal: profile table is a convenience, not a dependency.
        pass


def signup(name: str, email: str, password: str) -> dict[str, Any]:
    client = _client()
    auth = _auth_client().auth
    email = email.lower().strip()
    try:
        res = client.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"name": name.strip()},
            }
        )
    except Exception as exc:  # noqa: BLE001 - surface Supabase message
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    user = res.get("user") if isinstance(res, dict) else getattr(res, "user", None)
    if user is None:
        raise HTTPException(status_code=400, detail="Account could not be created.")
    _upsert_profile(client, user, name.strip())

    # Auto sign-in so the user lands in the app immediately.
    token = ""
    try:
        ses = auth.sign_in_with_password({"email": email, "password": password})
        token = (getattr(ses, "access_token", None)
                 or getattr(getattr(ses, "session", None), "access_token", None)
                 or "")
    except Exception:
        token = ""
    return _normalize_user(user, token)


def login(email: str, password: str) -> dict[str, Any]:
    auth = _auth_client().auth
    try:
        res = auth.sign_in_with_password({"email": email.lower().strip(), "password": password})
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid email or password.") from exc
    user = getattr(res, "user", None)
    session = getattr(res, "session", None)
    token = (getattr(res, "access_token", None)
             or getattr(session, "access_token", None)
             or "")
    try:
        _upsert_profile(_client(), user, _normalize_user(user).get("name", ""))
    except Exception:
        pass
    return _normalize_user(user, token)


def logout(access_token: str) -> None:
    if not access_token:
        return
    try:
        _auth_client().auth.sign_out()  # best-effort server-side revocation
    except Exception:
        pass


def me(access_token: str) -> dict[str, Any]:
    try:
        res = _auth_client().auth.get_user(access_token)
        user = getattr(res, "user", None)
        data = getattr(res, "data", None)
        if user is None and isinstance(data, dict):
            user = data.get("user")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid or expired session.") from exc
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return _normalize_user(user)


def require_user(authorization: str | None) -> dict[str, Any]:
    """Resolve the authenticated user from the ``Authorization`` header."""
    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail="Live database is not configured. Add SUPABASE_URL, SUPABASE_ANON_KEY "
            "and SUPABASE_SERVICE_ROLE_KEY to the .env file.",
        )
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing authentication.")
    token = authorization.split(" ", 1)[1].strip()
    return me(token)


# --------------------------------------------------------------------------- #
# Data helpers (all scoped by user id, server-side trusted client)
# --------------------------------------------------------------------------- #
def _progress_row(user_id: str) -> dict[str, Any] | None:
    res = _client().table("progress").select("data").eq("user_id", user_id).execute()
    rows = res.data if res else []
    if not rows:
        return None
    return rows[0].get("data") or {}


def _reconcile(user_id: str, data: dict[str, Any]) -> None:
    """Rebuild the relational side-tables from the authoritative progress snapshot."""
    client = _client()
    # completed lessons
    client.table("completed_lessons").delete().eq("user_id", user_id).execute()
    for lesson_id in data.get("completedLessons") or []:
        client.table("completed_lessons").insert(
            {"user_id": user_id, "lesson_id": lesson_id, "completed_at": _now_iso()}
        ).execute()
    # quiz attempts
    client.table("quiz_attempts").delete().eq("user_id", user_id).execute()
    for s in data.get("quizScores") or []:
        client.table("quiz_attempts").insert(
            {
                "user_id": user_id,
                "quiz_id": s.get("quizId", ""),
                "title": s.get("title", ""),
                "score": s.get("score", 0),
                "best": s.get("best", 0),
                "date": s.get("date", ""),
            }
        ).execute()
    # achievements
    client.table("achievements").delete().eq("user_id", user_id).execute()
    for aid in unlocked_achievements(data):
        client.table("achievements").insert(
            {"user_id": user_id, "achievement_id": aid, "unlocked_at": _now_iso()}
        ).execute()


def get_progress(user_id: str) -> dict[str, Any]:
    return _progress_row(user_id) or {}


def save_progress(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    client = _client()
    client.table("progress").upsert(
        {"user_id": user_id, "data": data, "updated_at": _now_iso()}
    ).execute()
    try:
        _reconcile(user_id, data)
    except Exception:
        # Side tables are best-effort; the authoritative snapshot already saved.
        pass
    return data


def get_settings(user_id: str) -> dict[str, Any]:
    res = _client().table("user_settings").select("settings").eq("user_id", user_id).execute()
    rows = res.data if res else []
    return (rows[0].get("settings") or {}) if rows else {}


def save_settings(user_id: str, settings: dict[str, Any]) -> dict[str, Any]:
    _client().table("user_settings").upsert(
        {"user_id": user_id, "settings": settings, "updated_at": _now_iso()}
    ).execute()
    return settings


def get_circuits(user_id: str) -> list[dict[str, Any]]:
    res = _client().table("saved_circuits").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    rows = res.data if res else []
    return [
        {
            "id": r.get("id"),
            "name": r.get("name", ""),
            "qubits": r.get("qubits", 2),
            "gates": r.get("gates", []),
        }
        for r in rows
    ]


def save_circuit(user_id: str, circuit: dict[str, Any]) -> dict[str, Any]:
    _client().table("saved_circuits").upsert(
        {
            "id": circuit["id"],
            "user_id": user_id,
            "name": circuit.get("name", ""),
            "qubits": circuit.get("qubits", 2),
            "gates": circuit.get("gates", []),
            "created_at": _now_iso(),
        }
    ).execute()
    return circuit


def delete_circuit(user_id: str, circuit_id: str) -> None:
    _client().table("saved_circuits").delete().eq("user_id", user_id).eq("id", circuit_id).execute()


def save_circuits(user_id: str, circuits: list[dict[str, Any]]) -> None:
    """Replace the user's full saved-circuit list (idempotent)."""
    client = _client()
    client.table("saved_circuits").delete().eq("user_id", user_id).execute()
    for circuit in circuits:
        client.table("saved_circuits").insert(
            {
                "id": circuit["id"],
                "user_id": user_id,
                "name": circuit.get("name", ""),
                "qubits": circuit.get("qubits", 2),
                "gates": circuit.get("gates", []),
                "created_at": _now_iso(),
            }
        ).execute()


def get_state(user_id: str) -> dict[str, Any]:
    data = get_progress(user_id) or {}
    return {
        "progress": data,
        "achievements": unlocked_achievements(data),
        "circuits": get_circuits(user_id),
        "settings": get_settings(user_id),
        "activity": list_activity(user_id),
    }


def record_activity(user_id: str, t: str, kind: str = "", ref: str = "") -> None:
    """Append one item to the user's learning-history feed (best-effort)."""
    try:
        _client().table("learning_activity").insert(
            {"user_id": user_id, "t": t, "kind": kind, "ref": ref, "ts": _now_iso()}
        ).execute()
    except Exception:
        pass  # the feed is a convenience; never block the caller on it.


def list_activity(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    """Return the user's most recent learning-history entries (newest first)."""
    try:
        res = (
            _client().table("learning_activity")
            .select("*")
            .eq("user_id", user_id)
            .order("ts", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception:
        return []
    rows = res.data if res else []
    return [
        {"t": r.get("t", ""), "kind": r.get("kind", ""), "ref": r.get("ref", ""), "ts": r.get("ts", "")}
        for r in rows
    ]


def get_lessons() -> list[dict[str, Any]]:
    """Shared lesson content (read-only). Returns [] when the table is empty."""
    try:
        res = _client().table("lessons").select("*").order("sort", desc=False).execute()
    except Exception:
        return []
    return (res.data if res else []) or []


def get_quiz_questions() -> list[dict[str, Any]]:
    """Shared quiz question bank (read-only). Returns [] when the table is empty."""
    try:
        res = _client().table("quiz_questions").select("*").order("sort", desc=False).execute()
    except Exception:
        return []
    return (res.data if res else []) or []


# --------------------------------------------------------------------------- #
# Request / response schemas
# --------------------------------------------------------------------------- #
class SignupRequest(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(min_length=3)
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


class ProgressSave(BaseModel):
    progress: dict[str, Any] = Field(default_factory=dict)


class CircuitPayload(BaseModel):
    id: str
    name: str = ""
    qubits: int = 2
    gates: list[dict[str, Any]] = Field(default_factory=list)


class SettingsPayload(BaseModel):
    settings: dict[str, Any] = Field(default_factory=dict)


class CircuitsSyncPayload(BaseModel):
    circuits: list[CircuitPayload] = Field(default_factory=list)


class ActivityPayload(BaseModel):
    t: str = Field(min_length=1)
    kind: str = ""
    ref: str = ""


# --------------------------------------------------------------------------- #
# Router
# --------------------------------------------------------------------------- #
router = APIRouter(prefix="/api")


def _configured_or_503():
    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail="Live database is not configured. Add SUPABASE_URL, SUPABASE_ANON_KEY "
            "and SUPABASE_SERVICE_ROLE_KEY to the .env file.",
        )


@router.get("/db/status")
def db_status():
    """Report the current storage mode. Drives the frontend demo/live banner."""
    if not is_configured():
        return {
            "mode": "demo",
            "configured": False,
            "tablesReady": False,
            "message": "SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are required.",
        }
    ready = tables_ready()
    return {"mode": "live" if ready else "config_pending", "configured": True, "tablesReady": ready}


@router.post("/auth/signup")
def signup_endpoint(req: SignupRequest):
    _configured_or_503()
    return signup(req.name, req.email, req.password)


@router.post("/auth/login")
def login_endpoint(req: LoginRequest):
    _configured_or_503()
    try:
        return login(req.email, req.password)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid email or password.") from exc


@router.post("/auth/logout")
def logout_endpoint(authorization: str | None = Header(default=None)):
    _configured_or_503()
    token = (authorization or "").split(" ", 1)[1].strip() if authorization and authorization.lower().startswith("bearer ") else ""
    logout(token)
    return {"ok": True}


@router.get("/auth/me")
def me_endpoint(authorization: str | None = Header(default=None)):
    _configured_or_503()
    return me((authorization or "").split(" ", 1)[1].strip() if authorization and authorization.lower().startswith("bearer ") else "")


def _user(authorization: str | None) -> dict[str, Any]:
    uid = require_user(authorization)
    return uid


@router.get("/data/state")
def data_state_endpoint(authorization: str | None = Header(default=None)):
    user = _user(authorization)
    return get_state(user["id"])


@router.get("/data/progress")
def data_progress_get(authorization: str | None = Header(default=None)):
    user = _user(authorization)
    return {"progress": get_progress(user["id"])}


@router.put("/data/progress")
def data_progress_put(req: ProgressSave, authorization: str | None = Header(default=None)):
    user = _user(authorization)
    return {"progress": save_progress(user["id"], req.progress)}


@router.get("/data/circuits")
def data_circuits_get(authorization: str | None = Header(default=None)):
    user = _user(authorization)
    return {"circuits": get_circuits(user["id"])}


@router.post("/data/circuits")
def data_circuits_post(req: CircuitPayload, authorization: str | None = Header(default=None)):
    user = _user(authorization)
    return {"circuit": save_circuit(user["id"], req.model_dump())}


@router.delete("/data/circuits/{circuit_id}")
def data_circuits_delete(circuit_id: str, authorization: str | None = Header(default=None)):
    user = _user(authorization)
    delete_circuit(user["id"], circuit_id)
    return {"ok": True}


@router.put("/data/circuits/sync")
def data_circuits_sync(req: CircuitsSyncPayload, authorization: str | None = Header(default=None)):
    user = _user(authorization)
    save_circuits(user["id"], [c.model_dump() for c in req.circuits])
    return {"ok": True, "count": len(req.circuits)}


@router.get("/data/settings")
def data_settings_get(authorization: str | None = Header(default=None)):
    user = _user(authorization)
    return {"settings": get_settings(user["id"])}


@router.put("/data/settings")
def data_settings_put(req: SettingsPayload, authorization: str | None = Header(default=None)):
    user = _user(authorization)
    return {"settings": save_settings(user["id"], req.settings)}


@router.get("/data/achievements")
def data_achievements_get(authorization: str | None = Header(default=None)):
    user = _user(authorization)
    return {"achievements": unlocked_achievements(get_progress(user["id"]) or {})}


@router.post("/data/activity")
def data_activity_post(req: ActivityPayload, authorization: str | None = Header(default=None)):
    user = _user(authorization)
    record_activity(user["id"], req.t, req.kind, req.ref)
    return {"ok": True}


@router.get("/data/activity")
def data_activity_get(authorization: str | None = Header(default=None)):
    user = _user(authorization)
    return {"activity": list_activity(user["id"])}


@router.get("/data/lessons")
def data_lessons_get(authorization: str | None = Header(default=None)):
    _user(authorization)
    return {"lessons": get_lessons()}


@router.get("/data/quizzes")
def data_quizzes_get(authorization: str | None = Header(default=None)):
    _user(authorization)
    return {"quizzes": get_quiz_questions()}
