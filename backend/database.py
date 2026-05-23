import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "meetings.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            filename TEXT,
            transcript TEXT,
            result_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_session(session_id: str, filename: str, transcript: str, result: dict):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        INSERT OR REPLACE INTO sessions (session_id, filename, transcript, result_json)
        VALUES (?, ?, ?, ?)
    """, (session_id, filename, transcript, json.dumps(result)))
    conn.commit()
    conn.close()

def get_sessions() -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT session_id, filename, result_json, created_at FROM sessions ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [{ "session_id": r[0], "filename": r[1], "result": json.loads(r[2]), "created_at": r[3] } for r in rows]

def get_session(session_id: str) -> dict | None:
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute(
        "SELECT session_id, filename, transcript, result_json FROM sessions WHERE session_id = ?",
        (session_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    return { "session_id": row[0], "filename": row[1], "transcript": row[2], "result": json.loads(row[3]) }

def save_message(session_id: str, role: str, content: str):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
        (session_id, role, content)
    )
    conn.commit()
    conn.close()

def get_history(session_id: str) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at",
        (session_id,)
    ).fetchall()
    conn.close()
    return [{ "role": r[0], "content": r[1] } for r in rows]