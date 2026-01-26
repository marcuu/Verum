# journal_bp.py — Journal blueprint (token auth, multi-origin CORS, rate-limit)
import os, sqlite3, json, time
from datetime import datetime, timezone
from collections import defaultdict, deque
from flask import Blueprint, request, jsonify, abort, g, make_response

# === Env/config ===
DB_PATH = os.environ.get("JOURNAL_DB_PATH", "journal.db")
ACCESS_TOKEN = os.environ.get("JOURNAL_ACCESS_TOKEN")  # REQUIRED

# Multi-origin allowlist (comma-separated)
_ALLOWED = os.environ.get("JOURNAL_ALLOWED_ORIGIN", "")
ALLOWED_ORIGINS = [o.strip() for o in _ALLOWED.split(",") if o.strip()]
# Always allow these origins (hardcoded fallback)
_HARDCODED_ORIGINS = ["https://marcusburgess.co.uk", "https://www.marcusburgess.co.uk"]
for _o in _HARDCODED_ORIGINS:
    if _o not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(_o)

PUBLIC_READ = os.environ.get("JOURNAL_PUBLIC_READ", "false").lower() == "true"
RATE_WINDOW = int(os.environ.get("JOURNAL_RATE_WINDOW", "300"))    # seconds
RATE_READ   = int(os.environ.get("JOURNAL_RATE_READ",   "120"))    # GET per window
RATE_WRITE  = int(os.environ.get("JOURNAL_RATE_WRITE",  "20"))     # POST/DELETE per window

# Create blueprint
journal_bp = Blueprint("journal", __name__)

# ========== DB ==========
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@journal_bp.teardown_app_request
def close_db(_):
    db = g.pop("db", None)
    db and db.close()

def init_db():
    db = get_db()
    db.execute("""
      CREATE TABLE IF NOT EXISTS entries(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL UNIQUE,     -- YYYY-MM-DD (UTC)
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    """)
    db.commit()

@journal_bp.before_app_request
def _init():
    # Only initialize if a journal route is hit (cheap anyway)
    if request.path.startswith("/journal/"):
        init_db()

# ========== Auth ==========
def require_auth():
    # Require token for all methods unless PUBLIC_READ and GET
    if request.method == "GET" and PUBLIC_READ:
        return
    token = request.headers.get("X-Access-Token")
    if not ACCESS_TOKEN or token != ACCESS_TOKEN:
        abort(401)

# ========== CORS & security headers ==========
def _matched_origin():
    origin = request.headers.get("Origin")
    if origin and (not ALLOWED_ORIGINS or origin in ALLOWED_ORIGINS):
        return origin
    return None

def cors(resp):
    origin = _matched_origin()
    if origin:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Access-Token"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
    # tiny hardening
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["X-Frame-Options"] = "DENY"
    return resp

@journal_bp.route("/api/entries", methods=["OPTIONS"])
@journal_bp.route("/api/entries/<day>", methods=["OPTIONS"])
@journal_bp.route("/api/export.json", methods=["OPTIONS"])
def options():
    return cors(make_response("", 204))

# ========== Rate limiter ==========
# Simple fixed-window per key (token if present, else client IP). In-memory (per worker).
_buckets: dict[str, deque] = defaultdict(deque)

def _client_ip():
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.remote_addr or "0.0.0.0"

def _rate_key(kind: str) -> str:
    token = request.headers.get("X-Access-Token") or ""
    who = token if token else _client_ip()
    return f"{kind}:{who}"

def _check_rate(kind: str, limit: int):
    if request.method == "OPTIONS":
        return  # never rate-limit preflights
    now = time.time()
    key = _rate_key(kind)
    q = _buckets[key]
    cutoff = now - RATE_WINDOW
    while q and q[0] < cutoff:
        q.popleft()

    if len(q) >= limit:
        retry_after = max(1, int(RATE_WINDOW - (now - q[0])))
        resp = jsonify({"error": "rate_limited", "retry_after_seconds": retry_after})
        resp.status_code = 429
        resp.headers["Retry-After"] = str(retry_after)
        resp.headers["X-RateLimit-Limit"] = str(limit)
        resp.headers["X-RateLimit-Remaining"] = "0"
        resp.headers["X-RateLimit-Reset"] = str(int(now + retry_after))
        # Use HTTPException-like escape hatch handled below
        raise _HttpResponse(resp)

    q.append(now)
    # Stash RL headers for this response in flask.g; after_request adds them.
    remaining = max(0, limit - len(q))
    g._rl_limit = str(limit)
    g._rl_remaining = str(remaining)
    g._rl_reset = str(int((q[0] if q else now) + RATE_WINDOW))

@journal_bp.after_app_request
def _add_rl_headers(resp):
    # Add RL headers only for /journal/* responses
    if request.path.startswith("/journal/") and hasattr(g, "_rl_limit"):
        resp.headers["X-RateLimit-Limit"] = g._rl_limit
        resp.headers["X-RateLimit-Remaining"] = g._rl_remaining
        resp.headers["X-RateLimit-Reset"] = g._rl_reset
    return cors(resp)  # also ensures CORS/security headers always present

class _HttpResponse(Exception):
    def __init__(self, response):
        self.response = response

@journal_bp.app_errorhandler(_HttpResponse)
def _return_http_response(e):
    return cors(e.response)

# ---- Ensure errors carry CORS headers too ----
from werkzeug.exceptions import HTTPException

@journal_bp.app_errorhandler(401)
def _err_401(e):
    resp = jsonify({"error": "unauthorized"})
    resp.status_code = 401
    return cors(resp)

@journal_bp.app_errorhandler(400)
def _err_400(e):
    resp = jsonify({"error": "bad_request"})
    resp.status_code = 400
    return cors(resp)

@journal_bp.app_errorhandler(404)
def _err_404(e):
    resp = jsonify({"error": "not_found"})
    resp.status_code = 404
    return cors(resp)

@journal_bp.app_errorhandler(405)
def _err_405(e):
    resp = jsonify({"error": "method_not_allowed"})
    resp.status_code = 405
    return cors(resp)

@journal_bp.app_errorhandler(500)
def _err_500(e):
    if isinstance(e, HTTPException):
        resp = jsonify({"error": e.name})
        resp.status_code = e.code
    else:
        resp = jsonify({"error": "server_error"})
        resp.status_code = 500
    return cors(resp)

# ========== Routes ==========
@journal_bp.get("/api/entries")
def list_entries():
    require_auth()
    _check_rate("read", RATE_READ)
    q = (request.args.get("q") or "").strip()
    db = get_db()
    if q:
        rows = db.execute("SELECT * FROM entries WHERE text LIKE ? ORDER BY day DESC", (f"%{q}%",)).fetchall()
    else:
        rows = db.execute("SELECT * FROM entries ORDER BY day DESC").fetchall()
    return jsonify([dict(r) for r in rows])

@journal_bp.get("/api/entries/<day>")
def get_entry(day):
    require_auth()
    _check_rate("read", RATE_READ)
    db = get_db()
    row = db.execute("SELECT * FROM entries WHERE day = ?", (day,)).fetchone()
    payload = dict(row) if row else {"day": day, "text": ""}
    return jsonify(payload)

@journal_bp.post("/api/entries")
def upsert_entry():
    require_auth()
    _check_rate("write", RATE_WRITE)
    data = request.get_json(force=True, silent=False) or {}
    day  = (data.get("day")  or datetime.now(timezone.utc).date().isoformat()).strip()
    text = (data.get("text") or "").strip()
    if not text:
        resp = jsonify({"error":"text required"}); resp.status_code = 400
        return resp
    ts = datetime.now(timezone.utc).isoformat()
    db = get_db()
    db.execute("""
      INSERT INTO entries(day, text, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(day) DO UPDATE SET text=excluded.text, updated_at=excluded.updated_at
    """, (day, text, ts, ts))
    db.commit()
    return jsonify({"ok": True, "day": day})

@journal_bp.delete("/api/entries/<day>")
def delete_entry(day):
    require_auth()
    _check_rate("write", RATE_WRITE)
    db = get_db()
    db.execute("DELETE FROM entries WHERE day = ?", (day,))
    db.commit()
    return jsonify({"ok": True})

@journal_bp.get("/api/export.json")
def export_json():
    require_auth()
    _check_rate("read", RATE_READ)
    db = get_db()
    rows = db.execute("SELECT * FROM entries ORDER BY day ASC").fetchall()
    return make_response(json.dumps([dict(r) for r in rows], ensure_ascii=False, indent=2), 200, {
        "Content-Type": "application/json"
    })
