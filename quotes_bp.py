# quotes_bp.py — Quotes API mounted under /journal
import os, sqlite3, json, time
from datetime import datetime, timezone, timedelta
from collections import defaultdict, deque
from flask import Blueprint, request, jsonify, abort, g, make_response

quotes_bp = Blueprint("quotes_bp", __name__)

QUOTES_DB_PATH = os.environ.get("QUOTES_DB_PATH", "/home/Marcuu/app/data/quotes.db")

# Reuse your existing token by default; can split later if you want
ACCESS_TOKEN = os.environ.get("JOURNAL_ACCESS_TOKEN")
QUOTES_TOKEN = os.environ.get("QUOTES_ACCESS_TOKEN") or ACCESS_TOKEN

_ALLOWED = os.environ.get("JOURNAL_ALLOWED_ORIGIN", "")
ALLOWED_ORIGINS = [o.strip() for o in _ALLOWED.split(",") if o.strip()]
# Always allow these origins (hardcoded fallback)
_HARDCODED_ORIGINS = ["https://marcusburgess.co.uk", "https://www.marcusburgess.co.uk"]
for _o in _HARDCODED_ORIGINS:
    if _o not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(_o)
PUBLIC_READ = os.environ.get("JOURNAL_PUBLIC_READ", "false").lower() == "true"

# Rate limit (reuse journal values)
RATE_WINDOW = int(os.environ.get("JOURNAL_RATE_WINDOW", "300"))
RATE_READ   = int(os.environ.get("JOURNAL_RATE_READ",   "120"))
RATE_WRITE  = int(os.environ.get("JOURNAL_RATE_WRITE",  "20"))

CORE_THRESHOLD = int(os.environ.get("QUOTES_CORE_THRESHOLD", "3"))
AVOID_DAYS     = int(os.environ.get("QUOTES_AVOID_DAYS", "14"))

# ========== DB ==========
def get_qdb():
    if "qdb" not in g:
        g.qdb = sqlite3.connect(QUOTES_DB_PATH)
        g.qdb.row_factory = sqlite3.Row
    return g.qdb

@quotes_bp.teardown_app_request
def close_qdb(_):
    qdb = g.pop("qdb", None)
    qdb and qdb.close()

def init_qdb():
    db = get_qdb()
    db.execute("""
      CREATE TABLE IF NOT EXISTS quotes(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT '',
        score INTEGER NOT NULL DEFAULT 0,
        last_seen_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    """)
    db.execute("""
      CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_text_author
      ON quotes(text, author);
    """)
    db.execute("""
      CREATE TABLE IF NOT EXISTS quotes_daily_pick(
        day TEXT PRIMARY KEY,
        quote_id INTEGER NOT NULL,
        picked_at TEXT NOT NULL
      );
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_quotes_score ON quotes(score);")
    db.execute("CREATE INDEX IF NOT EXISTS idx_quotes_last_seen ON quotes(last_seen_at);")
    db.commit()

@quotes_bp.before_app_request
def _init():
    # Only run for requests under this blueprint's URL space
    if request.path.startswith("/journal/api/quotes"):
        init_qdb()

# ========== Auth ==========
def require_auth():
    if request.method == "GET" and PUBLIC_READ:
        return
    token = request.headers.get("X-Access-Token")
    if not QUOTES_TOKEN or token != QUOTES_TOKEN:
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
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["X-Frame-Options"] = "DENY"
    return resp

# ========== Rate limiter ==========
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

class _HttpResponse(Exception):
    def __init__(self, response):
        self.response = response

def _check_rate(kind: str, limit: int):
    if request.method == "OPTIONS":
        return
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
        raise _HttpResponse(resp)
    q.append(now)

@quotes_bp.app_errorhandler(_HttpResponse)
def _return_http_response(e):
    return cors(e.response)

@quotes_bp.after_app_request
def _after(resp):
    return cors(resp)

# ========== Helpers ==========
def _utc_ts():
    return datetime.now(timezone.utc).isoformat()

def _utc_day():
    return datetime.now(timezone.utc).date().isoformat()

def _is_core(score: int) -> bool:
    return score >= CORE_THRESHOLD

# ========== OPTIONS ==========
@quotes_bp.route("/api/quotes", methods=["OPTIONS"], strict_slashes=False)
@quotes_bp.route("/api/quotes/daily", methods=["OPTIONS"])
@quotes_bp.route("/api/quotes/<int:qid>/vote", methods=["OPTIONS"])
@quotes_bp.route("/api/quotes/<int:qid>", methods=["OPTIONS"])
def options():
    return cors(make_response("", 204))

# ========== Routes ==========
@quotes_bp.get("/api/quotes/ping")
def ping():
    return cors(jsonify({"ok": True, "bp": "quotes"}))

@quotes_bp.post("/api/quotes", strict_slashes=False)
def create_quote():
    require_auth()
    _check_rate("write", RATE_WRITE)

    data = request.get_json(force=True, silent=False) or {}
    text   = (data.get("text") or "").strip()
    author = (data.get("author") or "").strip()

    if not text:
        return cors(jsonify({"error": "text required"})), 400

    ts = _utc_ts()
    db = get_qdb()
    try:
        db.execute("""
          INSERT INTO quotes(text, author, score, created_at, updated_at)
          VALUES (?, ?, 0, ?, ?)
        """, (text, author, ts, ts))
        db.commit()
    except sqlite3.IntegrityError:
        row = db.execute("SELECT * FROM quotes WHERE text=? AND author=?", (text, author)).fetchone()
        q = dict(row) if row else None
        if q: q["is_core"] = _is_core(int(q["score"]))
        return cors(jsonify({"ok": True, "quote": q}))

    row = db.execute("SELECT * FROM quotes WHERE text=? AND author=?", (text, author)).fetchone()
    q = dict(row) if row else None
    if q: q["is_core"] = _is_core(int(q["score"]))
    return cors(jsonify({"ok": True, "quote": q}))

@quotes_bp.get("/api/quotes/daily")
def daily_quote():
    require_auth()
    _check_rate("read", RATE_READ)

    day = _utc_day()
    ts  = _utc_ts()
    db  = get_qdb()

    picked = db.execute("SELECT quote_id FROM quotes_daily_pick WHERE day=?", (day,)).fetchone()
    if picked:
        row = db.execute("SELECT * FROM quotes WHERE id=?", (picked["quote_id"],)).fetchone()
        if row:
            q = dict(row); q["is_core"] = _is_core(int(q["score"]))
            return cors(jsonify({"day": day, "quote": q}))

    cutoff_iso = (datetime.now(timezone.utc) - timedelta(days=AVOID_DAYS)).isoformat()

    # Prefer regular, avoid recently-seen
    row = db.execute("""
      SELECT * FROM quotes
      WHERE score < ?
        AND (last_seen_at IS NULL OR last_seen_at < ?)
      ORDER BY RANDOM()
      LIMIT 1
    """, (CORE_THRESHOLD, cutoff_iso)).fetchone()

    if not row:
        row = db.execute("""
          SELECT * FROM quotes
          WHERE score < ?
          ORDER BY RANDOM()
          LIMIT 1
        """, (CORE_THRESHOLD,)).fetchone()

    if not row:
        row = db.execute("""
          SELECT * FROM quotes
          WHERE score >= ?
            AND (last_seen_at IS NULL OR last_seen_at < ?)
          ORDER BY RANDOM()
          LIMIT 1
        """, (CORE_THRESHOLD, cutoff_iso)).fetchone()

    if not row:
        row = db.execute("SELECT * FROM quotes ORDER BY RANDOM() LIMIT 1").fetchone()

    if not row:
        return cors(jsonify({"day": day, "quote": None}))

    qid = row["id"]
    db.execute("INSERT INTO quotes_daily_pick(day, quote_id, picked_at) VALUES (?, ?, ?)", (day, qid, ts))
    db.execute("UPDATE quotes SET last_seen_at=?, updated_at=? WHERE id=?", (ts, ts, qid))
    db.commit()

    q = dict(row); q["is_core"] = _is_core(int(q["score"]))
    return cors(jsonify({"day": day, "quote": q}))

@quotes_bp.post("/api/quotes/<int:qid>/vote")
def vote_quote(qid):
    require_auth()
    _check_rate("write", RATE_WRITE)

    data = request.get_json(force=True, silent=False) or {}
    delta = int(data.get("delta") or 0)
    if delta not in (-1, 1):
        return cors(jsonify({"error": "delta must be -1 or 1"})), 400

    ts = _utc_ts()
    db = get_qdb()
    row = db.execute("SELECT * FROM quotes WHERE id=?", (qid,)).fetchone()
    if not row:
        return cors(jsonify({"error": "not_found"})), 404

    new_score = int(row["score"]) + delta
    db.execute("UPDATE quotes SET score=?, updated_at=? WHERE id=?", (new_score, ts, qid))
    db.commit()

    row2 = db.execute("SELECT * FROM quotes WHERE id=?", (qid,)).fetchone()
    q = dict(row2); q["is_core"] = _is_core(int(q["score"]))
    return cors(jsonify({"ok": True, "quote": q}))

@quotes_bp.delete("/api/quotes/<int:qid>")
def delete_quote(qid):
    require_auth()
    _check_rate("write", RATE_WRITE)

    db = get_qdb()
    db.execute("DELETE FROM quotes WHERE id=?", (qid,))
    db.execute("DELETE FROM quotes_daily_pick WHERE quote_id=?", (qid,))
    db.commit()
    return cors(jsonify({"ok": True}))

@quotes_bp.route("/api/quotes", methods=["GET"], strict_slashes=False)
def list_quotes():
    require_auth()
    _check_rate("read", RATE_READ)

    core = request.args.get("core")  # "1" core only, "0" regular only
    db = get_qdb()

    if core == "1":
        rows = db.execute("SELECT * FROM quotes WHERE score >= ? ORDER BY updated_at DESC", (CORE_THRESHOLD,)).fetchall()
    elif core == "0":
        rows = db.execute("SELECT * FROM quotes WHERE score < ? ORDER BY updated_at DESC", (CORE_THRESHOLD,)).fetchall()
    else:
        rows = db.execute("SELECT * FROM quotes ORDER BY updated_at DESC").fetchall()

    out = []
    for r in rows:
        q = dict(r)
        q["is_core"] = _is_core(int(q["score"]))
        out.append(q)

    return cors(jsonify(out))


@quotes_bp.route("/api/quotes/ping2", methods=["GET"])
def ping2():
    return cors(make_response("quotes-bp-live", 200))