import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Learning workspace",
  description: "Study summaries, notes, practice questions and a tutor for one lesson video.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
