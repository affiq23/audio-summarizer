import json
import numpy as np
from openai import OpenAI
from database import save_message, get_history
import sqlite3, os

DB_PATH = os.path.join(os.path.dirname(__file__), "meetings.db")

def init_vectors():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            content TEXT NOT NULL,
            embedding TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def store_transcript(session_id: str, transcript: str):
    client = OpenAI()
    init_vectors()

    # chunk
    chunks = []
    size, overlap = 500, 50
    for i in range(0, len(transcript), size - overlap):
        chunk = transcript[i:i + size].strip()
        if chunk:
            chunks.append(chunk)

    # embed all chunks in one API call
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=chunks
    )

    conn = sqlite3.connect(DB_PATH)
    # clear old chunks for this session
    conn.execute("DELETE FROM chunks WHERE session_id = ?", (session_id,))
    for chunk, emb in zip(chunks, response.data):
        conn.execute(
            "INSERT INTO chunks (session_id, content, embedding) VALUES (?, ?, ?)",
            (session_id, chunk, json.dumps(emb.embedding))
        )
    conn.commit()
    conn.close()

def ask(session_id: str, question: str, history: list[dict]) -> str:
    client = OpenAI()

    # embed the question
    q_emb = client.embeddings.create(
        model="text-embedding-3-small",
        input=[question]
    ).data[0].embedding

    # retrieve top 4 chunks by cosine similarity
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT content, embedding FROM chunks WHERE session_id = ?",
        (session_id,)
    ).fetchall()
    conn.close()

    scored = sorted(
        rows,
        key=lambda r: cosine_similarity(q_emb, json.loads(r[1])),
        reverse=True
    )[:4]

    context = "\n\n".join(r[0] for r in scored)

    system = f"""You are a meeting assistant. Answer questions about the meeting using the context below.
Be specific — reference names, decisions, and details from the transcript.
If the answer isn't in the context, say so.

Relevant transcript excerpts:
{context}"""

    messages = [{"role": "system", "content": system}] + history + [{"role": "user", "content": question}]
    response = client.chat.completions.create(model="gpt-4o", messages=messages)
    return response.choices[0].message.content