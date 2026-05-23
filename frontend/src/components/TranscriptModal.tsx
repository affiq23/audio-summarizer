import { useState } from "react";

interface Props {
  transcript: string;
  onClose: () => void;
  onSave: (t: string) => void;
}

export function TranscriptModal({ transcript, onClose, onSave }: Props) {
  const [value, setValue] = useState(transcript);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="section-title">Transcript</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn-primary"
              style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}
              onClick={() => { onSave(value); onClose(); }}
            >
              Save
            </button>
            <button className="btn-ghost small" onClick={onClose}>✕</button>
          </div>
        </div>
        <textarea
          className="transcript-editor"
          style={{ flex: 1, minHeight: 0 }}
          value={value}
          onChange={e => setValue(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}