import os
import subprocess
import tempfile

from openai import OpenAI


def split_audio(file_path: str, chunk_minutes: int = 10) -> list[str]:
    chunk_paths = []
    i = 0
    while True:
        out = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        out.close()
        start = i * chunk_minutes * 60
        result = subprocess.run(
            [
                "ffmpeg",
                "-ss",
                str(start),
                "-t",
                str(chunk_minutes * 60),
                "-i",
                file_path,
                "-y",
                out.name,
            ],
            capture_output=True,
        )

        # if output file is empty, we're done
        if os.path.getsize(out.name) < 1000:
            os.unlink(out.name)
            break

        chunk_paths.append(out.name)
        i += 1
    return chunk_paths


def transcribe_audio(file_path: str) -> str:
    client = OpenAI()
    chunks = split_audio(file_path)

    # if file is small enough, just send it directly
    if not chunks:
        with open(file_path, "rb") as f:
            return client.audio.transcriptions.create(model="whisper-1", file=f).text

    parts = []
    for chunk in chunks:
        try:
            with open(chunk, "rb") as f:
                parts.append(
                    client.audio.transcriptions.create(model="whisper-1", file=f).text
                )
        finally:
            os.unlink(chunk)

    return " ".join(parts)
