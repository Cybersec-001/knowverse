import type { Metadata } from "next";
import { Dashboard } from "@/components/Dashboard";
export const metadata: Metadata = {
  title: "Home",
  description: "Your Knowverse notebooks and recent study videos.",
  robots: { index: false, follow: false },
};
export default function DashboardPage() {
  return <Dashboard />;
}
