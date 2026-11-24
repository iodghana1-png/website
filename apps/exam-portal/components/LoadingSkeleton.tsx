type LoadingKind = "exams" | "attempt" | "result";

export function LoadingSkeleton({ kind }: { kind: LoadingKind }) {
  const message = kind === "attempt" ? "Loading your examination…" : kind === "result" ? "Loading your result…" : "Loading your examinations…";
  return (
    <div className="loading-state" role="status" aria-live="polite" aria-busy="true">
      <p className="loading-label">{message}</p>
      <div aria-hidden="true">
        {kind === "attempt" ? (
          <>
            <div className="skeleton-heading"><div><span className="skeleton skeleton-eyebrow" /><span className="skeleton skeleton-title" /></div><span className="skeleton skeleton-timer" /></div>
            <div className="skeleton skeleton-note" />
            <div className="workspace-grid"><div className="skeleton-nav"><span className="skeleton skeleton-short" /><div className="skeleton-nav-grid">{Array.from({ length: 10 }, (_, i) => <span key={i} className="skeleton skeleton-square" />)}</div></div><div className="panel skeleton-panel"><span className="skeleton skeleton-eyebrow" /><span className="skeleton skeleton-line skeleton-long" /><span className="skeleton skeleton-line skeleton-medium" />{Array.from({ length: 4 }, (_, i) => <span key={i} className="skeleton skeleton-option" />)}</div></div>
          </>
        ) : (
          <div className="panel skeleton-panel"><span className="skeleton skeleton-eyebrow" /><span className="skeleton skeleton-title" /><span className="skeleton skeleton-line skeleton-long" /><span className="skeleton skeleton-line skeleton-medium" /><span className="skeleton skeleton-button" /></div>
        )}
      </div>
    </div>
  );
}
