import { useState, useCallback, useEffect } from "react";
import type { MeetingResult, SessionMeta } from "./types";
import { UploadView } from "./components/UploadView";
import { EditView } from "./components/EditView";
import { ResultsView } from "./components/ResultsView";
import { LoadingView } from "./components/LoadingView";

type AppState = "idle" | "transcribing" | "editing" | "summarizing" | "results";

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<SessionMeta[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/sessions")
      .then(r => r.json())
      .then(d => setSessions(d.sessions))
      .catch(() => {});
  }, [appState]);

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
    setSessionId(crypto.randomUUID());
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleTranscribe = async () => {
    if (!file) return;
    setAppState("transcribing");
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/transcribe", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTranscript(data.transcript);
      setAppState("editing");
    } catch {
      setError("Transcription failed. Check the backend.");
      setAppState("idle");
    }
  };

  const handleSummarize = async () => {
    setAppState("summarizing");
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, session_id: sessionId, filename: file?.name ?? "untitled" }),
      });
      if (!res.ok) throw new Error();
      const data: MeetingResult = await res.json();
      setResult(data);
      setAppState("results");
    } catch {
      setError("Summarization failed.");
      setAppState("editing");
    }
  };

  const loadSession = async (s: SessionMeta) => {
    const res = await fetch(`http://localhost:8000/sessions/${s.session_id}`);
    const data = await res.json();
    setSessionId(s.session_id);
    setTranscript(data.transcript);
    setResult(data.result);
    setFile(null);
    setAppState("results");
  };

  const handleReset = () => {
    setAppState("idle");
    setFile(null);
    setTranscript("");
    setResult(null);
    setError(null);
    setSessionId("");
  };

  return (
    <div className="app">
      <header className="header">
        <span className="logo"></span>
        {appState !== "idle" && (
          <button className="btn-ghost" onClick={handleReset}>← New Meeting</button>
        )}
      </header>

      {appState === "idle" && (
        <UploadView
          file={file} dragging={dragging} error={error} sessions={sessions}
          onDrop={handleDrop}
          onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onFileChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          onTranscribe={handleTranscribe}
          onLoadSession={loadSession}
        />
      )}
      {appState === "transcribing" && <LoadingView label="Transcribing audio" sub="" />}
      {appState === "editing" && (
        <EditView transcript={transcript} onChange={setTranscript} onSummarize={handleSummarize} filename={file?.name ?? ""} />
      )}
      {appState === "summarizing" && <LoadingView label="Analyzing transcript" sub="Extracting summary and action items..." />}
      {appState === "results" && result && (
        <ResultsView
          data={result} transcript={transcript}
          sessionId={sessionId} file={file}
          onTranscriptSave={setTranscript}
        />
      )}
    </div>
  );
}