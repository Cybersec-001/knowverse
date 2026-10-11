import type { Metadata } from "next";
import { Profile } from "@/components/Account";
export const metadata: Metadata = {
  title: "Profile",
  description: "Your Knowverse profile and study stats.",
  robots: { index: false, follow: false },
};
export default Profile;
