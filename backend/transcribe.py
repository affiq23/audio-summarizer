from openai import OpenAI

# opens temp file in binary and sends it to Whisper
def transcribe_audio(file_path: str) -> str:
    client = OpenAI()  # picks up OPENAI_API_KEY from env automatically
    with open(file_path, "rb") as f:
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=f
        )
    return response.text