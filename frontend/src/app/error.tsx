'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-xl bg-danger/15 border border-danger/30 flex items-center justify-center mx-auto mb-4">
          <span className="text-danger text-xl">⚠</span>
        </div>
        <h2 className="text-sm font-semibold text-text mb-2">Something went wrong</h2>
        <p className="text-xs text-text-2 mb-5 font-mono">{error.message}</p>
        <button onClick={reset} className="btn-primary w-full justify-center">
          Retry
        </button>
      </div>
    </div>
  );
}
