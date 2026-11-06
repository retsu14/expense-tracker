"use client";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en-PH">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#141414",
          color: "#e8e2d6",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#a19b90", marginBottom: 24 }}>
            {error.digest ? `Error ${error.digest}` : "Please try again."}
          </p>
          <button
            type="button"
            onClick={retry}
            style={{
              height: 44,
              padding: "0 20px",
              borderRadius: 12,
              border: 0,
              background: "#e8e2d6",
              color: "#141414",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
