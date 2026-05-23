export function EditView({ transcript, onChange, onSummarize, filename }: {
  transcript: string;
  onChange: (v: string) => void;
  onSummarize: () => void;
  filename: string;
}) {
  return (
    <main className="edit-view">
      <div className="edit-header">
        <div>
          <h2 className="section-title">Transcript</h2>
          <p className="edit-hint">{filename} — Edit if needed, then summarize</p>
        </div>
        <button className="btn-primary" onClick={onSummarize}>Summarize →</button>
      </div>
      <textarea
        className="transcript-editor"
        value={transcript}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </main>
  );
}