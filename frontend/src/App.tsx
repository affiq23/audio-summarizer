import { useState } from "react";
import type { MeetingResult } from "./types";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/process", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Processing failed");
      const data: MeetingResult = await res.json();
      setResult(data);
    } catch (e) {
      setError("Something went wrong. Check the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <h1>Meeting Summarizer</h1>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button onClick={handleSubmit} disabled={!file || loading}>
          {loading ? "Processing..." : "Summarize"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {result && <Results data={result} />}
    </main>
  );
}

function Results({ data }: { data: MeetingResult }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>

      <section>
        <h2>Transcript</h2>
        <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>{data.transcript}</p>
      </section>

      <section>
        <h2>Summary</h2>
        <p>{data.summary}</p>

        <h3>Key Points</h3>
        <ul>
          {data.key_points.map((point, i) => <li key={i}>{point}</li>)}
        </ul>

        <h3>Action Items</h3>
        {data.action_items.length === 0
          ? <p>None identified.</p>
          : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Task</th>
                  <th style={{ textAlign: "left" }}>Owner</th>
                  <th style={{ textAlign: "left" }}>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {data.action_items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.task}</td>
                    <td>{item.owner ?? "—"}</td>
                    <td>{item.deadline ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </section>

    </div>
  );
}