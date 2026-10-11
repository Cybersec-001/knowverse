import type { Metadata } from "next";
import { Settings } from "@/components/Account";
export const metadata: Metadata = {
  title: "Settings",
  description: "Appearance and account settings for your Knowverse workspace.",
  robots: { index: false, follow: false },
};
export default Settings;
