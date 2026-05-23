export function LoadingView({ label, sub }: { label: string; sub: string }) {
  return (
    <main className="loading-view">
      <div className="spinner" />
      <p className="loading-label">{label}</p>
      <p className="loading-sub">{sub}</p>
    </main>
  );
}