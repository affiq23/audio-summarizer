from openai import OpenAI
import json

def summarize_transcript(transcript: str) -> dict:
    client = OpenAI()
    prompt = f"""
You are a meeting assistant. Given the transcript below, return a JSON object with:
- "summary": a comprehensive 6-8 sentence overview. Include specific names mentioned, key decisions made, any disagreements or concerns raised, and the overall tone of the meeting.
- "key_points": list of 5-8 strings, each a specific and concrete discussion point (not vague)
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