"use client";
import { Brand } from "./Brand";
import { Dialog } from "./UI";
import Link from "next/link";
import {
  BookOpen,
  Compass,
  Home,
  Settings,
  Search,
  User,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, backendEnabled, token } from "@/lib/api";
type SearchItem = { id: string; title: string };
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [items, setItems] = useState<SearchItem[]>([]),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!open) return;
    if (backendEnabled() && token())
      api<{ notebooks: SearchItem[] }>("/notebooks")
        .then((r) => setItems(r.notebooks))
        .catch(() =>
          setNotice("Notebook search is unavailable. Try again shortly."),
        );
    else {
      try {
        queueMicrotask(() =>
          setItems(
            JSON.parse(localStorage.getItem("knowverse-notebooks") ?? "[]"),
          ),
        );
      } catch {}
    }
  }, [open]);
  const nav = [
    { href: "/dashboard", label: "Home", Icon: Home },
    { href: "/dashboard#notebooks", label: "My notebooks", Icon: BookOpen },
    { href: "/dashboard#recent", label: "Recent", Icon: Clock },
  ];
  const heading =
    path === "/dashboard"
      ? "Home"
      : path === "/notebook"
        ? "My notebooks"
        : path === "/study"
          ? "Learning workspace"
          : path === "/settings"
            ? "Settings"
            : "Profile";
  return (
    <div className="app-shell">
      <a href="#workspace-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand-link">
          <Brand />
        </Link>
        <div>
          <div className="sidebar-caption">Learn & create</div>
          <nav aria-label="Main navigation" className="space-y-1">
            {nav.map(({ href, label, Icon }, i) => (
              <Link
                key={label}
                className={
                  "nav-item " +
                  ((path === "/dashboard" && i === 0) ||
                  (path === "/notebook" && i === 1)
                    ? "active"
                    : "")
                }
                aria-current={path === href ? "page" : undefined}
                href={href}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            <button className="nav-item w-full" onClick={() => setOpen(true)}>
              <Compass size={18} />
              Explore / search
            </button>
          </nav>
        </div>
        <div className="mt-auto">
          <div className="sidebar-note">
            <BookOpen size={18} className="mb-3" />
            <b className="block mb-1">A little, every day.</b>Make room for your
            next idea.
          </div>
          <div className="divider my-5" />
          <Link
            className={"nav-item " + (path === "/settings" ? "active" : "")}
            href="/settings"
          >
            <Settings size={18} />
            Settings
          </Link>
          <Link
            className={"nav-item " + (path === "/profile" ? "active" : "")}
            href="/profile"
          >
            <User size={18} />
            Profile
          </Link>
        </div>
      </aside>
      <div className="main">
        <div className="mobile-bar">
          <Link href="/" className="brand-link">
            <Brand />
          </Link>
          <span className="eyebrow">Learning workspace</span>
        </div>
        <header className="shell-topbar">
          <span className="muted">
            Personal workspace <span className="mx-2">/</span>
            <b>{heading}</b>
          </span>
          <div className="shell-tools">
            <button className="search-trigger" onClick={() => setOpen(true)}>
              <Search size={15} />
              <span>Find a notebook</span>
              <kbd>⌘ K</kbd>
            </button>
            <Link
              href="/profile"
              className="profile-dot"
              aria-label="Open your profile"
            >
              <User size={16} />
            </Link>
          </div>
        </header>
        <div id="workspace-content" tabIndex={-1}>
          {children}
        </div>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[
          { href: "/dashboard", label: "Home", Icon: Home },
          { href: "/dashboard#notebooks", label: "Notebooks", Icon: BookOpen },
          { href: "/settings", label: "Settings", Icon: Settings },
          { href: "/profile", label: "Profile", Icon: User },
        ].map(({ href, label, Icon }) => (
          <Link
            key={label}
            href={href}
            aria-current={path === href ? "page" : undefined}
          >
            <Icon size={19} />
            {label}
          </Link>
        ))}
      </nav>
      {open && (
        <Dialog title="Find your next lesson" onClose={() => setOpen(false)}>
          <input
            autoFocus
            className="field"
            aria-label="Search notebooks"
            placeholder="Search your notebooks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                (
                  e.currentTarget.nextElementSibling?.querySelector(
                    "a",
                  ) as HTMLElement
                )?.focus();
              }
            }}
          />
          <div
            className="mt-4"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const links = Array.from(e.currentTarget.querySelectorAll("a"));
                const index = links.indexOf(
                  document.activeElement as HTMLAnchorElement,
                );
                links[
                  (index + (e.key === "ArrowDown" ? 1 : -1) + links.length) %
                    links.length
                ]?.focus();
              }
            }}
          >
            {items
              .filter((n) =>
                n.title.toLowerCase().includes(query.toLowerCase()),
              )
              .map((n) => (
                <Link
                  className="command-result"
                  key={n.id}
                  href={`/notebook?id=${encodeURIComponent(n.id)}`}
                  onClick={() => setOpen(false)}
                >
                  <span>{n.title}</span>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            {!items.length && (
              <p className="muted text-sm py-5">
                {notice || "Create your first notebook to make it searchable."}
              </p>
            )}
            <button
              className="btn btn-quiet mt-4"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard");
              }}
            >
              Open all notebooks
            </button>
            <p className="muted text-xs mt-4">
              For source passages, open a video and use its transcript search.
            </p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
