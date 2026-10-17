import type { Metadata } from "next";
import "./globals.css";
import { Inter, Instrument_Serif } from "next/font/google";
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
import {ThemeProvider} from "@/components/ThemeProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieNotice } from "@/components/CookieNotice";
export const metadata: Metadata = {
  metadataBase: new URL("https://knowverse.dpdns.org"),
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
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Knowverse",
  url: "https://knowverse.dpdns.org",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description:
    "Knowverse turns lesson videos into editable study notes, summaries, exam notes and practice questions.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  author: { "@type": "Person", name: "Deepak Tiwari" },
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
        <SiteFooter />
        <CookieNotice />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
