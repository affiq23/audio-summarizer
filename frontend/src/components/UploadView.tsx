import { useRef } from "react";
import type { SessionMeta } from "../types";

interface Props {
  file: File | null;
  dragging: boolean;
  error: string | null;
  sessions: SessionMeta[];
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTranscribe: () => void;
  onLoadSession: (s: SessionMeta) => void;
}

export function UploadView({ file, dragging, error, sessions, onDrop, onDragOver, onDragLeave, onFileChange, onTranscribe, onLoadSession }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            <>
              <span className="drop-icon">✓</span>
              <span className="drop-filename">{file.name}</span>
              <span className="drop-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </>
          ) : (
            <>
              <span className="drop-icon">↑</span>
              <span className="drop-label">Drop audio file here</span>
              <span className="drop-formats">m4a · mp3 · wav · mp4 · ogg</span>
            </>
          )}
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn-primary" disabled={!file} onClick={onTranscribe}>Transcribe →</button>
      </div>

      {sessions.length > 0 && (
        <div className="sessions-panel">
          <p className="block-title" style={{ marginBottom: "1rem" }}>Past Meetings</p>
          <div className="sessions-list">
            {sessions.map(s => (
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