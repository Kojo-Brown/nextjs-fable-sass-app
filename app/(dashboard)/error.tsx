"use client";

// Error boundaries must be Client Components — they use lifecycle state to
// catch render errors in the segment below and offer a reset.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: "2rem" }}>
      <h2>Something went wrong</h2>
      <p style={{ color: "#9aa2ad" }}>
        {error.digest ? `Reference: ${error.digest}` : "Unexpected error."}
      </p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
