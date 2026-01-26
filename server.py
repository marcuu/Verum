# server.py — parent app that mounts blueprints
import os
from flask import Flask, make_response

from journal_bp import journal_bp
from quotes_bp import quotes_bp  # <-- add this

app = Flask(__name__)
app.register_blueprint(journal_bp, url_prefix="/journal")
app.register_blueprint(quotes_bp, url_prefix="/journal")  # <-- add this

@app.get("/healthz")
def health():
    return make_response("ok", 200)

if __name__ == "__main__" and not os.environ.get("PYTHONANYWHERE_SITE"):
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
