import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "../types";

export function ChatPanel({ sessionId }: { sessionId: string }) {
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
      <h2 className="section-title" style={{ marginBottom: "0.75rem", flexShrink: 0 }}>Ask</h2>
      <div className="chat-messages">
        {messages.length === 0 && <p className="none-text">Ask anything about this meeting.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <span className="chat-role">{m.role === "user" ? "You" : "AI"}</span>
            <p>{m.content}</p>
          </div>
        ))}
        {loading && (
          <div className="chat-msg assistant">
            <span className="chat-role">AI</span>
            <p className="none-text">Thinking...</p>
          </div>
        )}
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