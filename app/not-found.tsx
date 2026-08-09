import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
      <div style={{ textAlign: "center" }}>
        <h1>404</h1>
        <p>That page doesn&apos;t exist.</p>
        <Link href="/dashboard">Back to dashboard</Link>
      </div>
    </main>
  );
}
