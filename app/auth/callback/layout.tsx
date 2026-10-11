import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Signing you in",
  description: "Finishing your Knowverse sign-in.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
