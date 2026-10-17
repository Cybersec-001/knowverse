import type { Metadata } from "next";
import { Auth } from "@/components/Auth";
export const metadata: Metadata = {
  alternates: { canonical: "/signup" },
  title: "Create your account",
  description: "Create a free Knowverse account to turn lesson videos into study notes.",
};
export default function Signup() {
  return <Auth kind="signup" />;
}
