from openai import OpenAI
import json

def summarize_transcript(transcript: str) -> dict:
    client = OpenAI()
    prompt = f"""
You are a meeting assistant. Given the transcript below, return a JSON object with:
- "summary": a 3-5 sentence overview of the meeting
- "key_points": list of strings, the main discussion points
- "action_items": list of objects with "task" (string), "owner" (string or null), "deadline" (string or null)

Transcript:
{transcript}

Return only valid JSON, no markdown.
"""
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{ "role": "user", "content": prompt }],
        response_format={ "type": "json_object" }
    )

    return json.loads(response.choices[0].message.content)