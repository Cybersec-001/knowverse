import type { Metadata } from "next";
import { Auth } from "@/components/Auth";
export const metadata: Metadata = {
  alternates: { canonical: "/login" },
  title: "Log in",
  description: "Log in to Knowverse to open your notebooks and study notes.",
};
export default function Login() {
  return <Auth kind="login" />;
}
