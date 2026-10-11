"use client";
import Link from "next/link";
export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-[var(--line)] bg-white px-6 py-5 text-xs muted">
      <span suppressHydrationWarning>
        © {new Date().getFullYear()} Knowverse
      </span>
      <Link href="/" className="hover:text-[var(--accent)]">
        Home
      </Link>
      <Link href="/privacy" className="hover:text-[var(--accent)]">
        Privacy
      </Link>
      <Link href="/terms" className="hover:text-[var(--accent)]">
        Terms
      </Link>
      <a
        href="mailto:deepaktiwari.cybersec@gmail.com"
        className="hover:text-[var(--accent)]"
      >
        Contact
      </a>
    </footer>
  );
}
