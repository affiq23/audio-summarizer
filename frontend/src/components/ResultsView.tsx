import { useState } from "react";
import type { MeetingResult } from "../types";
import { AudioBar } from "./AudioBar";
import { ChatPanel } from "./ChatPanel";
import { TranscriptModal } from "./TranscriptModal";

interface Props {
  data: MeetingResult;
  transcript: string;
  sessionId: string;
  file: File | null;
  onTranscriptSave: (t: string) => void;
}

export function ResultsView({ data, transcript, sessionId, file, onTranscriptSave }: Props) {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <main className="results-view">
      <AudioBar file={file} onTranscriptOpen={() => setShowTranscript(true)} />

      <div className="results-grid">
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
            {data.action_items.length === 0 ? (
              <p className="none-text">None identified.</p>
            ) : (
              <table className="action-table">
                <thead>
                  <tr><th>Task</th><th>Owner</th><th>Deadline</th></tr>
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
            )}
          </div>
        </section>

        <ChatPanel sessionId={sessionId} />
      </div>

      {showTranscript && (
        <TranscriptModal
          transcript={transcript}
          onClose={() => setShowTranscript(false)}
          onSave={onTranscriptSave}
        />
      )}
    </main>
  );
}