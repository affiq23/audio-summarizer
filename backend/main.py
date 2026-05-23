from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transcribe import transcribe_audio
from summarize import summarize_transcript
from chat import store_transcript, ask, init_vectors
from database import init_db, save_message, get_history, save_session, get_sessions, get_session
import tempfile, os
from dotenv import load_dotenv

load_dotenv()
init_db()
init_vectors()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/transcribe")
async def transcribe_meeting(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        transcript = transcribe_audio(tmp_path)
        return { "transcript": transcript }
    finally:
        os.unlink(tmp_path)

class SummarizeRequest(BaseModel):
    transcript: str
    session_id: str
    filename: str = "untitled"

@app.post("/summarize")
async def summarize_meeting(body: SummarizeRequest):
    store_transcript(body.session_id, body.transcript)
    result = summarize_transcript(body.transcript)
    save_session(body.session_id, body.filename, body.transcript, result)
    return result

class ChatRequest(BaseModel):
    session_id: str
    question: str

@app.post("/chat")
async def chat(body: ChatRequest):
    history = get_history(body.session_id)
    answer = ask(body.session_id, body.question, history)
    save_message(body.session_id, "user", body.question)
    save_message(body.session_id, "assistant", answer)
    return { "answer": answer }

@app.get("/sessions")
async def list_sessions():
    return { "sessions": get_sessions() }

@app.get("/sessions/{session_id}")
async def load_session(session_id: str):
    session = get_session(session_id)
    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.get("/sessions/{session_id}/history")
async def session_history(session_id: str):
    return { "messages": get_history(session_id) }