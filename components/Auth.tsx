"use client";
import { Brand } from "@/components/Brand";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { friendlyError } from "./UI";
import { API, api, backendEnabled } from "@/lib/api";

const socialProviders = [
  { id: "google", label: "Google" },
  { id: "microsoft", label: "Microsoft" },
  { id: "github", label: "GitHub" },
];
function AuthForm({ kind }: { kind: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const linkError = useSearchParams().get("error") ?? "";
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return (
    <div className="auth-page min-h-screen flex flex-col">
      <header className="p-6 md:p-8">
        <Link href="/" className="brand-link">
          <Brand />
        </Link>
      </header>
      <main className="flex-1 grid place-items-center px-5 pb-16">
        <div className="auth-layout">
          <aside className="auth-story">
            <div className="eyebrow">Your next chapter</div>
            <h2>
              Good ideas deserve
              <br />a place to grow.
            </h2>
            <p className="muted">
              Keep the lesson. Find the insight. Make learning your own.
            </p>
            <div className="auth-line muted text-xs">
              Video → understanding → knowledge
            </div>
          </aside>
          <div className="auth-form">
            <h1 className="text-center text-[29px] font-semibold tracking-[-.04em]">
              {kind === "login" ? "Welcome back" : "Make learning yours"}
            </h1>
            <p className="muted text-center mt-2 mb-8">
              {kind === "login"
                ? "Pick up where you left off."
                : "Your next lesson starts here."}
            </p>
            <div className="card p-6 md:p-8">
              {backendEnabled() && (
                <>
                  <div className="grid gap-3">
                    {socialProviders.map((p) => (
                      <a
                        key={p.id}
                        href={`${API}/auth/oauth/${p.id}/start`}
                        className="btn btn-quiet w-full"
                      >
                        Continue with {p.label}
                      </a>
                    ))}
                  </div>
                  <div className="divider my-5" />
                </>
              )}
              <p className="muted text-xs mb-5">Continue with email.</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!backendEnabled()) {
                    router.push("/dashboard");
                    return;
                  }
                  setLoading(true);
                  setNotice("");
                  try {
                    const r = await api<{ token: string }>(
                      kind === "login" ? "/auth/login" : "/auth/signup",
                      {
                        method: "POST",
                        body: JSON.stringify({ email, password }),
                      },
                    );
                    localStorage.setItem("knowverse-token", r.token);
                    router.push("/dashboard");
                  } catch (error) {
                    setNotice(
                      error instanceof Error
                        ? friendlyError(error.message)
                        : "Could not sign in",
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <label
                  htmlFor="email"
                  className="font-semibold text-xs block mb-2"
                >
                  Email address
                </label>
                <input
                  required
                  type="email"
                  id="email"
                  autoComplete="email"
                  className="field mb-4"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <label
                  htmlFor="password"
                  className="font-semibold text-xs block mb-2"
                >
                  Password
                </label>
                <input
                  required
                  minLength={kind === "signup" ? 8 : 1}
                  maxLength={100}
                  type="password"
                  id="password"
                  autoComplete={
                    kind === "signup" ? "new-password" : "current-password"
                  }
                  className="field mb-5"
                  placeholder={
                    kind === "signup"
                      ? "At least 8 characters"
                      : "Your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full"
                >
                  {loading
                    ? "Please wait"
                    : kind === "login"
                      ? backendEnabled()
                        ? "Log in"
                        : "Log in to demo"
                      : backendEnabled()
                        ? "Create account"
                        : "Create demo account"}{" "}
                  <ArrowRight size={16} />
                </button>
              </form>
              {(notice || linkError) && (
                <p role="status" className="text-xs muted mt-4">
                  {notice || linkError}
                </p>
              )}
            </div>
            <p className="text-center muted mt-6">
              {kind === "login" ? (
                <>
                  New here?{" "}
                  <Link className="link-accent" href="/signup">
                    Create an account
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link className="link-accent" href="/login">
                    Log in
                  </Link>
                </>
              )}
            </p>
            <p className="text-center text-xs muted mt-5">
              {backendEnabled()
                ? "Your account connects to the configured learning backend."
                : "Demo only. No account is created and credentials are not stored."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export function Auth({ kind }: { kind: "login" | "signup" }) {
  return (
    <Suspense fallback={null}>
      <AuthForm kind={kind} />
    </Suspense>
  );
}
