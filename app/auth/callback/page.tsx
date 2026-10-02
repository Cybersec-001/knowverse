"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (token) {
      localStorage.setItem("knowverse-token", token);
      window.history.replaceState(null, "", window.location.pathname);
      router.replace("/dashboard");
    } else {
      router.replace("/login?error=" + encodeURIComponent("Could not complete login"));
    }
  }, [router]);
  return (
    <main className="min-h-screen grid place-items-center">
      <p className="muted">Signing you in...</p>
    </main>
  );
}
