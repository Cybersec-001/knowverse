"use client";
import { useEffect } from "react";
export function ThemeProvider() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const saved = localStorage.getItem("knowverse-theme") ?? "light";
      document.documentElement.dataset.theme =
        saved === "system" ? (media.matches ? "dark" : "light") : saved;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return null;
}
