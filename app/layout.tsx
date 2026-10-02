import type { Metadata } from "next";
import "./globals.css";
import { Inter, Instrument_Serif } from "next/font/google";
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
import {ThemeProvider} from "@/components/ThemeProvider";
import Link from "next/link";
export const metadata: Metadata = {
  metadataBase: new URL("https://cybersec-001.github.io/knowverse/"),
  title: {
    default: "Knowverse - Turn lesson videos into study notes",
    template: "%s | Knowverse",
  },
  description:
    "Build editable study notes, summaries and practice questions from lesson videos. Public YouTube videos may need a separate caption upload.",
  openGraph: {
    title: "Knowverse - Study from video",
    description:
      "Editable notes, summaries and practice questions linked to the source video.",
    type: "website",
    siteName: "Knowverse",
  },
  twitter: {
    card: "summary",
    title: "Knowverse - Study from video",
    description:
      "Editable notes, summaries and practice questions linked to the source video.",
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body><ThemeProvider/>
        {children}
        <footer className="border-t border-[var(--line)] bg-white px-6 py-5 text-xs muted flex justify-center gap-5">
          <Link href="/privacy" className="hover:text-[var(--accent)]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[var(--accent)]">
            Terms
          </Link>
        </footer>
      </body>
    </html>
  );
}
