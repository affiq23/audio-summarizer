from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from transcribe import transcribe_audio
from summarize import summarize_transcript
import tempfile, os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# write upload to temp file
@app.post("/process")
async def process_meeting(file: UploadFile = File(...)):
    extension = os.path.splitext(file.filename)[1] # gets whatever file extension the audio recording is
    with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    # sequential calls -> transcribe first, the summarize with the transcript
    try:
        transcript = transcribe_audio(tmp_path)
        result = summarize_transcript(transcript)
        return { "transcript": transcript, **result }
    finally:
        os.unlink(tmp_path) # delete temp file