"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Plus, ArrowUpRight, Play, ChevronRight } from "lucide-react";
import { Dialog, Skeleton, friendlyError } from "./UI";
import { Shell } from "./Shell";
import { api, backendEnabled, token } from "@/lib/api";
import { useRouter } from "next/navigation";
import { initialNotebooks, Notebook } from "@/lib/data";
export function Dashboard() {
  const [notebooks, setNotebooks] = useState<Notebook[]>(
    backendEnabled() ? [] : initialNotebooks,
  );
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(backendEnabled());
  const [creating, setCreating] = useState(false);
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (backendEnabled()) {
      if (!token()) {
        router.replace("/login");
        return;
      }
      api<{
        notebooks: Array<{
          id: string;
          title: string;
          video_count: number;
          updated_at: string;
        }>;
      }>("/notebooks")
        .then((data) =>
          setNotebooks(
            data.notebooks.map((n) => ({
              id: n.id,
              title: n.title,
              subject: "Personal notebook",
              updated: n.updated_at
                ? new Date(n.updated_at).toLocaleDateString()
                : "Not started",
              videos: n.video_count,
              color: "mint",
            })),
          ),
        )
        .catch((e) => setError(friendlyError(e.message)))
        .finally(() => setLoading(false));
      return;
    }
    try {
      const saved = JSON.parse(
        localStorage.getItem("knowverse-notebooks") || "[]",
      );
      if (Array.isArray(saved))
        queueMicrotask(() => setNotebooks([...saved, ...initialNotebooks]));
    } catch {}
  }, [router]);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (backendEnabled()) {
      setCreating(true);
      try {
        const { notebook } = await api<{
          notebook: { id: string; title: string };
        }>("/notebooks", {
          method: "POST",
          body: JSON.stringify({ title: name.trim() }),
        });
        setShow(false);
        router.push(`/notebook?id=${encodeURIComponent(notebook.id)}`);
      } catch (e) {
        setError(
          friendlyError(
            e instanceof Error ? e.message : "Could not create notebook",
          ),
        );
      }
      setCreating(false);
      return;
    }
    const fresh = {
      id: "new-" + Date.now(),
      title: name.trim(),
      subject: "Personal notebook",
      updated: "Updated just now",
      videos: 0,
      color: "mint",
    };
    const saved = [fresh, ...notebooks.filter((n) => n.id.startsWith("new-"))];
    localStorage.setItem("knowverse-notebooks", JSON.stringify(saved));
    setNotebooks([fresh, ...notebooks]);
    setName("");
    setShow(false);
  };
  return (
    <Shell>
      <main className="page" id="notebooks">
        {error && (
          <p role="alert" className="text-[#b64e47] mb-4">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <div className="eyebrow mb-3">Your space</div>
            <h1 className="text-[32px] md:text-[38px] font-semibold tracking-[-.05em]">
              Make room for knowledge.
            </h1>
            <p className="muted mt-2">
              Everything you’re learning, all in one place.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShow(true)}>
            <Plus size={18} /> New notebook
          </button>
        </div>
        <div className="dashboard-intro">
          <div>
            <div className="eyebrow mb-3">One place. Every idea.</div>
            <h2>Your next chapter starts here.</h2>
            <p className="muted">
              Collect a lesson, keep the insight, and come back ready to learn.
            </p>
          </div>
          <BookOpen size={42} strokeWidth={1} />
        </div>
        <div className="stat-row" aria-label="Collection overview">
          <div className="stat">
            <strong>{notebooks.length}</strong>
            <span className="muted">Notebooks</span>
          </div>
          <div className="stat">
            <strong>{notebooks.reduce((n, item) => n + item.videos, 0)}</strong>
            <span className="muted">Videos collected</span>
          </div>
          <div className="stat">
            <strong>Personal</strong>
            <span className="muted">Learning workspace</span>
          </div>
        </div>
        <label className="sr-only" htmlFor="filter-notebooks">
          Filter notebooks
        </label>
        <input
          id="filter-notebooks"
          className="field notebook-filter"
          placeholder="Find a notebook..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {!backendEnabled() && (
          <p className="muted text-xs mb-4">
            Offline sample collection. No live video processing is running.
          </p>
        )}
        {loading ? (
          <Skeleton />
        ) : notebooks.length ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 id="recent" className="text-base font-semibold">
                Recent notebooks
              </h2>
              <span className="small-label">{notebooks.length} notebooks</span>
            </div>
            {filter &&
              !notebooks.some((n) =>
                n.title.toLowerCase().includes(filter.toLowerCase()),
              ) && (
                <div className="card p-8">
                  <h3 className="font-semibold">
                    No notebooks match that search
                  </h3>
                  <p className="muted mt-2">
                    Try a different name or clear the filter.
                  </p>
                  <button
                    className="link-accent mt-4"
                    onClick={() => setFilter("")}
                  >
                    Clear search
                  </button>
                </div>
              )}
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {notebooks
                .filter((n) =>
                  n.title.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((n) => (
                  <Link
                    href={
                      backendEnabled()
                        ? `/notebook?id=${encodeURIComponent(n.id)}`
                        : `/notebook?id=${encodeURIComponent(n.id)}`
                    }
                    className="notebook-card card p-5 md:p-6 hover:border-[#accfba] transition-colors group"
                    key={n.id}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl grid place-items-center mb-6 ${n.color === "peach" ? "bg-[#fbf0e8] text-[#a96d50]" : n.color === "lilac" ? "bg-[#f0eefa] text-[#72648e]" : "bg-[#eaf4ed] text-[var(--accent)]"}`}
                    >
                      <BookOpen size={20} strokeWidth={1.8} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[17px] font-semibold tracking-tight">
                        {n.title}
                      </h3>
                      <ArrowUpRight
                        size={16}
                        className="muted group-hover:text-[var(--accent)]"
                      />
                    </div>
                    <p className="muted mt-2 text-xs">{n.subject}</p>
                    <div className="divider mt-6 pt-4 flex justify-between text-xs muted">
                      <span>
                        {n.videos} {n.videos === 1 ? "video" : "videos"}
                      </span>
                      <span>{n.updated}</span>
                    </div>
                  </Link>
                ))}
            </div>
          </>
        ) : (
          <div className="card py-16 px-5 text-center">
            <div className="bg-[#eaf4ed] text-[var(--accent)] w-14 h-14 rounded-xl grid place-items-center mx-auto mb-5">
              <BookOpen size={25} />
            </div>
            <h2 className="text-xl font-semibold">Start your first notebook</h2>
            <p className="muted max-w-sm mx-auto mt-2 mb-6">
              Collect your videos in one place and turn them into something you
              can study.
            </p>
            <button className="btn btn-primary" onClick={() => setShow(true)}>
              <Plus size={16} /> New notebook
            </button>
          </div>
        )}
        {!backendEnabled() && (
          <div className="card mt-9 p-6 flex flex-wrap gap-5 items-center justify-between bg-[#f7faf7]">
            <div>
              <div className="eyebrow mb-2">Pick up where you left off</div>
              <h3 className="text-lg font-semibold">
                The cell: Structure and function
              </h3>
              <p className="muted text-xs mt-1">
                Biology foundations · 18:42 min
              </p>
            </div>
            <Link href="/study?demo=1" className="btn btn-quiet">
              <Play size={14} /> Continue studying <ChevronRight size={14} />
            </Link>
          </div>
        )}
      </main>
      {show && (
        <Dialog title="Create a notebook" onClose={() => setShow(false)}>
          <form onSubmit={create}>
            <p className="muted mb-5">
              Give your next chapter a name. You can add a video after this.
            </p>
            <label
              htmlFor="notebook-name"
              className="text-xs font-semibold block mb-2"
            >
              Notebook name
            </label>
            <input
              id="notebook-name"
              autoFocus
              required
              maxLength={120}
              className="field"
              placeholder="e.g. Machine learning foundations"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {error && (
              <p role="alert" className="error-notice">
                {error}
              </p>
            )}
            <button
              disabled={creating}
              className="btn btn-primary w-full mt-6"
              type="submit"
            >
              {creating ? "Creating..." : "Create notebook"}
            </button>
          </form>
        </Dialog>
      )}
    </Shell>
  );
}
