import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "My notebooks",
  description: "Your Knowverse notebooks and the lesson videos inside them.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
