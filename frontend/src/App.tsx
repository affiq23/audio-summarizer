import { useState, useRef, useCallback, useEffect } from "react";
import type { MeetingResult, ChatMessage } from "./types";

type AppState = "idle" | "transcribing" | "editing" | "summarizing" | "results";

interface SessionMeta {
  session_id: string;
  filename: string;
  created_at: string;
  result: MeetingResult;
}

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
`;

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("http://localhost:8000/sessions")
      .then(r => r.json())
      .then(d => setSessions(d.sessions))
      .catch(() => {});
  }, [appState]); // refresh when returning to idle

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
    <>
      <style>{FONTS}</style>
      <style>{css}</style>
      <div className="app">
        <header className="header">
          <span className="logo"></span>
          {appState !== "idle" && (
            <button className="btn-ghost" onClick={handleReset}>← New Meeting</button>
          )}
        </header>

        {appState === "idle" && (
          <UploadView
            file={file} dragging={dragging} error={error} fileInputRef={fileInputRef}
            sessions={sessions}
            onDrop={handleDrop}
            onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onFileChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            onTranscribe={handleTranscribe}
            onLoadSession={loadSession}
          />
        )}
        {appState === "transcribing" && <LoadingView label="Transcribing audio" sub="Sending to Whisper..." />}
        {appState === "editing" && (
          <EditView transcript={transcript} onChange={setTranscript} onSummarize={handleSummarize} filename={file?.name ?? ""} />
        )}
        {appState === "summarizing" && <LoadingView label="Analyzing transcript" sub="Extracting summary and action items..." />}
        {appState === "results" && result && (
          <ResultsView data={result} transcript={transcript} sessionId={sessionId} onBack={() => setAppState("editing")} />
        )}
      </div>
    </>
  );
}

function UploadView({ file, dragging, error, fileInputRef, sessions, onDrop, onDragOver, onDragLeave, onFileChange, onTranscribe, onLoadSession }: any) {
  return (
    <main className="upload-view">
      <div className="upload-left">
        <div className="hero">
          <h1 className="title">Meeting<br />Summarizer</h1>
          <p className="subtitle">Drop an audio file. Get a transcript,<br />summary, and action items.</p>
        </div>
        <div
          className={`dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={onFileChange} />
          {file ? (
            <><span className="drop-icon">✓</span><span className="drop-filename">{file.name}</span><span className="drop-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span></>
          ) : (
            <><span className="drop-icon">↑</span><span className="drop-label">Drop audio file here</span><span className="drop-formats">m4a · mp3 · wav · mp4 · ogg</span></>
          )}
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn-primary" disabled={!file} onClick={onTranscribe}>Transcribe →</button>
      </div>

      {sessions.length > 0 && (
        <div className="sessions-panel">
          <p className="block-title" style={{ marginBottom: "1rem" }}>Past Meetings</p>
          <div className="sessions-list">
            {sessions.map((s: SessionMeta) => (
              <button key={s.session_id} className="session-card" onClick={() => onLoadSession(s)}>
                <span className="session-filename">{s.filename}</span>
                <span className="session-preview">{s.result.summary.slice(0, 80)}...</span>
                <span className="session-date">{new Date(s.created_at).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function LoadingView({ label, sub }: { label: string; sub: string }) {
  return (
    <main className="loading-view">
      <div className="spinner" />
      <p className="loading-label">{label}</p>
      <p className="loading-sub">{sub}</p>
    </main>
  );
}

function EditView({ transcript, onChange, onSummarize, filename }: any) {
  return (
    <main className="edit-view">
      <div className="edit-header">
        <div>
          <h2 className="section-title">Transcript</h2>
          <p className="edit-hint">{filename} — Edit if needed, then summarize</p>
        </div>
        <button className="btn-primary" onClick={onSummarize}>Summarize →</button>
      </div>
      <textarea className="transcript-editor" value={transcript} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
    </main>
  );
}

function ResultsView({ data, transcript, sessionId, onBack }: {
  data: MeetingResult; transcript: string; sessionId: string; onBack: () => void;
}) {
  return (
    <main className="results-view">
      <div className="results-grid">

        <section className="panel">
          <div className="panel-header">
            <h2 className="section-title">Transcript</h2>
            <button className="btn-ghost small" onClick={onBack}>Edit</button>
          </div>
          <p className="transcript-text">{transcript}</p>
        </section>

        <section className="panel analysis">
          <div className="analysis-block">
            <h2 className="section-title">Summary</h2>
            <p className="summary-text">{data.summary}</p>
          </div>
          <div className="analysis-block">
            <h3 className="block-title">Key Points</h3>
            <ul className="key-points">
              {data.key_points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className="analysis-block">
            <h3 className="block-title">Action Items</h3>
            {data.action_items.length === 0 ? <p className="none-text">None identified.</p> : (
              <table className="action-table">
                <thead><tr><th>Task</th><th>Owner</th><th>Deadline</th></tr></thead>
                <tbody>
                  {data.action_items.map((item, i) => (
                    <tr key={i}><td>{item.task}</td><td>{item.owner ?? "—"}</td><td>{item.deadline ?? "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <ChatPanel sessionId={sessionId} />

      </div>
    </main>
  );
}

function ChatPanel({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`http://localhost:8000/sessions/${sessionId}/history`)
      .then(r => r.json())
      .then(d => setMessages(d.messages))
      .catch(() => {});
  }, [sessionId]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, question }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <section className="panel chat-column">
      <h2 className="section-title" style={{ marginBottom: "1rem" }}>Ask</h2>
      <div className="chat-messages">
        {messages.length === 0 && <p className="none-text">Ask anything about this meeting.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <span className="chat-role">{m.role === "user" ? "You" : "AI"}</span>
            <p>{m.content}</p>
          </div>
        ))}
        {loading && <div className="chat-msg assistant"><span className="chat-role">AI</span><p className="none-text">Thinking...</p></div>}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-col">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask a question..."
        />
        <button className="btn-primary" onClick={send} disabled={loading || !input.trim()} style={{ width: "100%" }}>
          Send
        </button>
      </div>
    </section>
  );
}

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0a;
    --surface: #111111;
    --border: #222222;
    --border-light: #2e2e2e;
    --text: #e8e3db;
    --text-muted: #666;
    --accent: #c8ff00;
    --accent-dim: rgba(200, 255, 0, 0.08);
    --font-display: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  .header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1.25rem 2rem; border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 10; background: var(--bg);
  }
  .logo { font-family: var(--font-display); font-weight: 800; font-size: 1rem; letter-spacing: -0.02em; color: var(--accent); }

  /* Upload */
  .upload-view {
    flex: 1; display: flex; gap: 3rem;
    padding: 3rem 2rem; max-width: 1100px; margin: 0 auto; width: 100%;
  }
  .upload-left { flex: 1; display: flex; flex-direction: column; gap: 2rem; justify-content: center; }
  .hero {}
  .title {
    font-family: var(--font-display); font-size: clamp(2.5rem, 5vw, 4.5rem);
    font-weight: 800; line-height: 0.95; letter-spacing: -0.04em; margin-bottom: 1rem;
  }
  .subtitle { color: var(--text-muted); font-size: 1rem; line-height: 1.6; }

  .dropzone {
    width: 100%; border: 1.5px dashed var(--border-light);
    border-radius: 12px; padding: 2.5rem 2rem;
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    cursor: pointer; transition: all 0.2s ease; background: var(--surface);
  }
  .dropzone:hover, .dropzone.dragging { border-color: var(--accent); background: var(--accent-dim); }
  .dropzone.has-file { border-color: var(--accent); border-style: solid; background: var(--accent-dim); }
  .drop-icon { font-size: 2rem; }
  .drop-label { font-size: 0.95rem; color: var(--text); }
  .drop-formats { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); letter-spacing: 0.05em; }
  .drop-filename { font-family: var(--font-mono); font-size: 0.85rem; color: var(--accent); }
  .drop-size { font-size: 0.75rem; color: var(--text-muted); }

  /* Sessions */
  .sessions-panel { width: 320px; display: flex; flex-direction: column; padding-top: 0.5rem; }
  .sessions-list { display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; max-height: 70vh; }
  .session-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 1rem; cursor: pointer;
    text-align: left; display: flex; flex-direction: column; gap: 0.35rem;
    transition: border-color 0.15s;
  }
  .session-card:hover { border-color: var(--border-light); }
  .session-filename { font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent); }
  .session-preview { font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; }
  .session-date { font-size: 0.7rem; color: #444; }

  /* Loading */
  .loading-view { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.25rem; }
  .spinner {
    width: 36px; height: 36px; border: 2px solid var(--border-light);
    border-top-color: var(--accent); border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-label { font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; }
  .loading-sub { font-size: 0.85rem; color: var(--text-muted); }

  /* Edit */
  .edit-view { flex: 1; display: flex; flex-direction: column; padding: 2rem; gap: 1.25rem; max-width: 900px; margin: 0 auto; width: 100%; }
  .edit-header { display: flex; justify-content: space-between; align-items: flex-end; }
  .edit-hint { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; font-family: var(--font-mono); }
  .transcript-editor {
    flex: 1; min-height: 400px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem;
    color: var(--text); font-family: var(--font-mono); font-size: 0.85rem;
    line-height: 1.7; resize: none; outline: none; transition: border-color 0.2s;
  }
  .transcript-editor:focus { border-color: var(--border-light); }

  /* Results — 3 columns */
  .results-view { flex: 1; padding: 1.5rem; overflow: hidden; }
.results-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: minmax(0, 1fr) 320px; /* Top takes remaining space, Chat is fixed to 320px */
    gap: 1.25rem;
    max-width: 1200px; 
    margin: 0 auto;
    height: calc(100vh - 100px); /* Keeps the entire app locked to the viewport height */
  }

  .panel {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 1.5rem;
    display: flex; flex-direction: column; gap: 1rem;
    overflow-y: auto;
  }
  .panel.analysis { gap: 1.75rem; }
  .panel-header { display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }

  .transcript-text { font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.8; color: #aaa; }

  .analysis-block { display: flex; flex-direction: column; gap: 0.75rem; flex-shrink: 0; }
  .summary-text { font-size: 0.9rem; line-height: 1.7; color: #ccc; }

  .key-points { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
  .key-points li { font-size: 0.85rem; color: #bbb; line-height: 1.5; padding-left: 1rem; position: relative; }
  .key-points li::before { content: "·"; position: absolute; left: 0; color: var(--accent); }

  .action-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .action-table th { text-align: left; font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.08em; color: var(--text-muted); padding: 0 0.75rem 0.75rem 0; text-transform: uppercase; }
  .action-table td { padding: 0.5rem 0.75rem 0.5rem 0; border-top: 1px solid var(--border); color: #ccc; vertical-align: top; }
  .none-text { font-size: 0.85rem; color: var(--text-muted); }

  /* Chat column */
  .chat-column { 
    grid-column: 1 / -1; /* Forces the chat to span across both top columns */
    display: flex; 
    flex-direction: column; 
    gap: 0; 
    padding: 1.5rem; 
  }
  .chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1rem; min-height: 0; }
  .chat-msg { display: flex; flex-direction: column; gap: 0.2rem; }
  .chat-msg.user { align-items: flex-end; }
  .chat-msg.assistant { align-items: flex-start; }
  .chat-role { font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; }
  .chat-msg p { font-size: 0.85rem; line-height: 1.55; max-width: 90%; padding: 0.65rem 0.85rem; border-radius: 8px; }
  .chat-msg.user p { background: var(--accent); color: #000; }
  .chat-msg.assistant p { background: #1a1a1a; color: var(--text); }
  .chat-input-col { display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; }
  .chat-input {
    width: 100%; background: #1a1a1a; border: 1px solid var(--border);
    border-radius: 6px; padding: 0.65rem 0.85rem;
    color: var(--text); font-family: var(--font-body); font-size: 0.85rem; outline: none;
  }
  .chat-input:focus { border-color: var(--border-light); }

  /* Buttons */
  .btn-primary {
    background: var(--accent); color: #000;
    font-family: var(--font-display); font-weight: 700; font-size: 0.9rem;
    border: none; border-radius: 6px; padding: 0.75rem 1.75rem;
    cursor: pointer; transition: opacity 0.15s, transform 0.1s; white-space: nowrap;
  }
  .btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
  .btn-ghost {
    background: transparent; color: var(--text-muted);
    font-family: var(--font-body); font-size: 0.85rem;
    border: 1px solid var(--border); border-radius: 6px;
    padding: 0.5rem 1rem; cursor: pointer; transition: color 0.15s, border-color 0.15s;
  }
  .btn-ghost:hover { color: var(--text); border-color: var(--border-light); }
  .btn-ghost.small { padding: 0.3rem 0.75rem; font-size: 0.8rem; }

  .section-title { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; letter-spacing: -0.02em; flex-shrink: 0; }
  .block-title { font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); flex-shrink: 0; }
  .error { color: #ff6b6b; font-size: 0.85rem; }

  @media (max-width: 900px) {
    .results-grid { grid-template-columns: 1fr; height: auto; }
    .upload-view { flex-direction: column; }
    .sessions-panel { width: 100%; }
    .title { font-size: 2.5rem; }
  }
`;