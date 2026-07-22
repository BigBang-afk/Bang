import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", textAlign: "center", padding: "1rem" }}>
          <p style={{ fontSize: "3rem", color: "#c9a24b" }}>404</p>
          <h1 style={{ fontSize: "1.5rem" }}>Page Not Found</h1>
          <p style={{ marginTop: "0.5rem", maxWidth: 420 }}>The page you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/" style={{ marginTop: "1.5rem", color: "#9c7a2e", textDecoration: "underline" }}>Back to Zarghoon Jewellers</Link>
        </div>
      </body>
    </html>
  );
}
