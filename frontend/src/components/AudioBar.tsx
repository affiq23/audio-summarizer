import { useRef, useState, useEffect } from "react";

interface Props {
  file: File | null;
  onTranscriptOpen: () => void;
}

export function AudioBar({ file, onTranscriptOpen }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    if (file) {
      const u = URL.createObjectURL(file);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    } else {
      setUrl("");
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [file]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  return (
    <div className="audio-bar">
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          onEnded={() => setPlaying(false)}
        />
      )}
      <button className="audio-play" onClick={toggle} disabled={!url}>
        {playing ? "⏸" : "▶"}
      </button>
      <div className="audio-scrubber-wrap">
        <input
          type="range" className="audio-scrubber"
          min={0} max={duration || 100} step={0.1}
          value={currentTime} onChange={seek} disabled={!url}
        />
      </div>
      <span className="audio-time">
        {url ? `${fmt(currentTime)} / ${fmt(duration)}` : "No audio — past session"}
      </span>
      <button className="btn-ghost small" onClick={onTranscriptOpen}>Transcript</button>
    </div>
  );
}