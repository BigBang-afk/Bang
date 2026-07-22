"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", textAlign: "center", padding: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
          <p style={{ marginTop: "0.5rem", maxWidth: 420, color: "#666" }}>
            We&apos;re sorry for the inconvenience. Please try again, or contact Zarghoon Jewellers directly if the problem continues.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: "1.5rem", background: "#1a1a1a", color: "#fff", padding: "0.6rem 1.5rem", border: "none", cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
