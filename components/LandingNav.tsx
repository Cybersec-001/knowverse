"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
export function LandingNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <nav className="landing-nav" aria-label="Public navigation">
        <a href="#how-it-works">The workspace</a>
        <Link href="/login" className="nav-login">
          Log in
        </Link>
        <Button asChild size="sm">
          <Link href="/signup">
            Get started <ArrowRight size={14} />
          </Link>
        </Button>
        <button
          type="button"
          className="menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="landing-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>
      {open && (
        <div id="landing-menu" className="landing-menu" role="menu">
          <a href="#how-it-works" onClick={close}>
            The workspace
          </a>
          <Link href="/login" onClick={close}>
            Log in
          </Link>
          <Link href="/privacy" onClick={close}>
            Privacy
          </Link>
          <Link href="/terms" onClick={close}>
            Terms
          </Link>
        </div>
      )}
    </>
  );
}
