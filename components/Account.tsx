"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "./Shell";
import { api, token, backendEnabled } from "@/lib/api";
import { Skeleton, friendlyError } from "./UI";
import { Moon, Sun, Monitor, ArrowRight, User } from "lucide-react";
export function Settings() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    queueMicrotask(() =>
      setTheme(localStorage.getItem("knowverse-theme") ?? "light"),
    );
  }, []);
  const apply = (value: string) => {
    localStorage.setItem("knowverse-theme", value);
    setTheme(value);
    document.documentElement.setAttribute(
      "data-theme",
      value === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : value,
    );
  };
  return (
    <Shell>
      <main className="page">
        <div className="eyebrow">Make it yours</div>
        <h1 className="text-4xl font-semibold mt-3 mb-10">Settings</h1>
        <div className="settings-grid">
          <nav
            aria-label="Settings sections"
            className="muted space-y-4 text-sm"
          >
            <a className="block" href="#appearance">
              Appearance
            </a>
            <a className="block" href="#account">
              Account & security
            </a>
            <a className="block" href="#preferences">
              Learning preferences
            </a>
          </nav>
          <div>
            <section className="settings-section" id="appearance">
              <h2>Appearance</h2>
              <p className="muted mb-5">
                A space that feels right. Saved on this device.
              </p>
              <div className="theme-options">
                {[
                  { value: "light", label: "Light", Icon: Sun },
                  { value: "dark", label: "Dark", Icon: Moon },
                  { value: "system", label: "System", Icon: Monitor },
                ].map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    aria-pressed={theme === value}
                    onClick={() => apply(value)}
                  >
                    <Icon size={20} className="mb-3" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="muted text-xs mt-5">
                Motion follows your device&apos;s reduced-motion preference.
              </p>
            </section>
            <section className="settings-section" id="account">
              <h2>Account & security</h2>
              <p className="muted">
                Your notebooks and study materials belong to your signed-in
                account.
              </p>
              <Link className="btn btn-quiet mt-5" href="/profile">
                View profile <ArrowRight size={15} />
              </Link>
              <div className="divider my-5" />
              <p className="muted text-sm">
                Account deletion is handled by email. No password or billing
                details are needed here.
              </p>
              <Link href="/privacy" className="link-accent text-sm">
                Read the privacy policy
              </Link>
            </section>
            <section className="settings-section" id="preferences">
              <h2>Learning preferences</h2>
              <p className="muted">
                Ask the tutor for a simpler explanation, Hindi, or Hinglish
                directly in your video workspace. Generated-content translation,
                notification preferences and storage quotas do not have
                dedicated controls in the current backend.
              </p>
            </section>
          </div>
        </div>
      </main>
    </Shell>
  );
}
export function Profile() {
  const [stats, setStats] = useState<{
      notebooks: number;
      videos: number;
    } | null>(null),
    [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (!backendEnabled()) return;
    if (!token()) {
      router.replace("/login");
      return;
    }
    api<{ notebooks: { video_count: number }[] }>("/notebooks")
      .then((r) =>
        setStats({
          notebooks: r.notebooks.length,
          videos: r.notebooks.reduce((n, item) => n + item.video_count, 0),
        }),
      )
      .catch((e) => setError(friendlyError(e.message)));
  }, [router]);
  return (
    <Shell>
      <main className="page">
        <div className="eyebrow">Your learning identity</div>
        <h1 className="text-4xl font-semibold mt-3 mb-10">Profile</h1>
        <section className="settings-section">
          <div className="flex items-center gap-5">
            <div className="profile-dot !w-16 !h-16">
              <User size={26} />
            </div>
            <div>
              <h2>Your personal workspace</h2>
              <p className="muted">A home for what you learn.</p>
            </div>
          </div>
        </section>
        {error && (
          <p className="error-notice" role="alert">
            {error}
          </p>
        )}
        {backendEnabled() && !stats && !error ? (
          <Skeleton />
        ) : stats ? (
          <div className="stat-row">
            <div className="stat">
              <strong>{stats.notebooks}</strong>
              <span className="muted">Notebooks created</span>
            </div>
            <div className="stat">
              <strong>{stats.videos}</strong>
              <span className="muted">Videos collected</span>
            </div>
            <div className="stat">
              <strong>Private</strong>
              <span className="muted">Account workspace</span>
            </div>
          </div>
        ) : (
          <p className="muted mb-6">
            Connect to the backend and sign in to see your collection totals.
          </p>
        )}
        <section className="settings-section">
          <h2>Your next lesson awaits.</h2>
          <p className="muted">
            Personal notes and question scores are available inside each video.
            Activity tracking is not collected by this version.
          </p>
          <div className="flex gap-3 flex-wrap mt-5">
            <Link href="/dashboard" className="btn btn-primary">
              Open notebooks <ArrowRight size={15} />
            </Link>
            <button
              className="btn btn-quiet"
              onClick={() => {
                localStorage.removeItem("knowverse-token");
                router.push("/login");
              }}
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    </Shell>
  );
}
