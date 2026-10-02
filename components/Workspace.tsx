"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
  MessageCircle,
  MoreHorizontal,
  Play,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { Shell } from "./Shell";
import { StudyScene } from "./StudyScene";
import { summaries, notes, examNotes, questions, transcript } from "@/lib/data";
type Block = { id: string; heading: string; text: string; time: string };
type Tab = "Summary" | "Notes" | "Exam notes" | "MCQ" | "Tutor";
const tabs: Tab[] = ["Summary", "Notes", "Exam notes", "MCQ", "Tutor"];
const initialBlocks: { [key: string]: Block[] } = {
  Summary: summaries,
  Notes: notes,
  "Exam notes": examNotes,
};
function seconds(t: string) {
  const [m, s] = t.split(":").map(Number);
  return m * 60 + s;
}
function downloadWord(html: string) {
  const blob = new Blob(
    [`<html><head><meta charset="utf-8"></head><body>${html}</body></html>`],
    { type: "application/msword" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "knowverse-study-notes.doc";
  a.click();
  URL.revokeObjectURL(url);
}
export function Workspace() {
  const [tab, setTab] = useState<Tab>("Summary");
  const [blocks, setBlocks] = useState(initialBlocks);
  const [time, setTime] = useState("00:00");
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [regen, setRegen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [qVersion, setQVersion] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [menu, setMenu] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [chat, setChat] = useState<
    { role: "me" | "tutor"; text: string; general?: boolean; time?: string }[]
  >([
    {
      role: "tutor",
      text: "Ask me anything about this video. I’ll point you to the moment it comes from.",
      time: "00:48",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const q = questions[qIndex],
    answered = answers[q.id] !== undefined,
    score = questions.filter((x) => answers[x.id] === x.answer).length;
  const allSearch = useMemo(
    () => [
      ...transcript.map((x) => ({
        ...x,
        heading: "Transcript",
        kind: "Transcript",
      })),
      ...notes.map((x) => ({ ...x, kind: "Notes" })),
      ...summaries.map((x) => ({ ...x, kind: "Summary" })),
      ...examNotes.map((x) => ({ ...x, kind: "Exam notes" })),
    ],
    [],
  );
  const results = search.trim()
    ? allSearch
        .filter((x) =>
          `${x.heading} ${x.text}`.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 8)
    : [];
  const jump = (t: string) => {
    setTime(t);
    setPlaying(false);
    document
      .getElementById("video-player")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const timeLink = (t: string) => (
    <button
      type="button"
      onClick={() => jump(t)}
      className="inline-flex items-center gap-1 link-accent text-xs hover:underline"
      aria-label={`Jump to ${t} in video`}
    >
      <Play size={11} fill="currentColor" /> {t}{" "}
      <span className="sr-only">Jump to timestamp</span>
    </button>
  );
  const edit = (b: Block) => {
    setEditing(b.id);
    setDraft(b.text);
  };
  const updateBlock = (id: string, text: string) => {
    setBlocks((prev) => ({
      ...prev,
      [tab]: prev[tab].map((b) => (b.id === id ? { ...b, text } : b)),
    }));
    setEditing(null);
  };
  const regenerate = (id: string) => {
    setRegen(id);
    setTimeout(() => {
      setBlocks((prev) => ({
        ...prev,
        [tab]: prev[tab].map((b) =>
          b.id === id
            ? {
                ...b,
                text: b.text.replace(/\s*\(Reworded\)$/, "") + " (Reworded)",
              }
            : b,
        ),
      }));
      setRegen(null);
    }, 850);
  };
  const ask = (suggestion?: string) => {
    const text = (suggestion ?? prompt).trim();
    if (!text) return;
    const general =
      /outside|world|universe|weather|football|capital|unrelated|moon/i.test(
        text,
      );
    const found = transcript.find((x) =>
      text
        .toLowerCase()
        .split(/\s+/)
        .some((w) => w.length > 4 && x.text.toLowerCase().includes(w)),
    );
    const source = found ?? transcript[2];
    setChat((prev) => [
      ...prev,
      { role: "me", text },
      {
        role: "tutor",
        general,
        text: general
          ? "Beyond this video: here is some general context. This demo has no live AI service, so connect an AI backend for a full answer."
          : `In this video, ${source.text.charAt(0).toLowerCase() + source.text.slice(1)} This is a sample answer based on the lesson transcript.`,
        time: general ? undefined : source.time,
      },
    ]);
    setPrompt("");
  };
  const exportHtml = `<h1>The cell: Structure and function</h1>${Object.entries(
    blocks,
  )
    .map(
      ([name, bs]) =>
        `<h2>${name}</h2>${bs.map((b) => `<h3>${b.heading} (${b.time})</h3><p>${b.text}</p>`).join("")}`,
    )
    .join("")}`;
  return (
    <Shell>
      <div className="workspace-frame">
        <main className="page !max-w-[1240px] workspace-scroll">
          <div className="mb-8 flex items-center gap-2 muted text-xs">
            <Link href="/dashboard" className="hover:underline">
              My notebooks
            </Link>
            <ChevronRight size={13} />
            <Link href="/notebook/biology" className="hover:underline">
              Biology foundations
            </Link>
            <ChevronRight size={13} />
            <span className="text-[var(--ink)]">The cell</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <div className="eyebrow mb-3">Learning workspace</div>
              <h1 className="text-[28px] md:text-[34px] font-semibold tracking-[-.045em] leading-tight">
                The cell: Structure and function
              </h1>
              <p className="muted mt-2">
                Biology foundations <span className="mx-2">·</span> 18:42 min{" "}
                <span className="mx-2">·</span>{" "}
                <span className="text-[var(--accent)]">Ready to study</span>
              </p>
            </div>
            <div className="flex gap-2 relative">
              <div className="relative">
                <button
                  className="btn btn-quiet"
                  onClick={() => setExportOpen(!exportOpen)}
                >
                  <Download size={16} /> Export <ChevronDown size={14} />
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-12 z-30 card p-1 min-w-44 shadow-sm">
                    <button
                      className="w-full text-left p-3 hover rounded-lg"
                      onClick={() => {
                        setExportOpen(false);
                        window.print();
                      }}
                    >
                      Save as PDF
                    </button>
                    <button
                      className="w-full text-left p-3 hover rounded-lg"
                      onClick={() => {
                        setExportOpen(false);
                        downloadWord(exportHtml);
                      }}
                    >
                      Download Word
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  aria-label="More options"
                  className="btn btn-quiet !px-3"
                  onClick={() => setMenu(!menu)}
                >
                  <MoreHorizontal size={18} />
                </button>
                {menu && (
                  <div className="absolute right-0 top-12 z-30 card p-1 min-w-44 shadow-sm">
                    <Link
                      className="block p-3 hover rounded-lg"
                      href="/notebook/biology"
                    >
                      Back to notebook
                    </Link>
                    <button
                      onClick={() => {
                        setMenu(false);
                        setTab("Tutor");
                      }}
                      className="w-full text-left p-3 hover rounded-lg"
                    >
                      Ask the tutor
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid xl:grid-cols-[minmax(0,1fr)_290px] gap-6 items-start">
            <div className="min-w-0">
              <div
                id="video-player"
                className="overflow-hidden rounded-[14px] bg-[#202b28] border border-[#273731]"
              >
                <div className="aspect-video min-h-[215px] max-h-[420px] flex flex-col justify-center items-center relative text-white">
                  <div className="absolute top-5 left-6 text-xs text-white/70 tracking-wide">
                    VIDEO PREVIEW · DEMO
                  </div>
                  <div className="flex items-center gap-3 opacity-75">
                    <div className="rounded-[22px] border border-white/25 w-20 h-20 grid place-items-center text-3xl">
                      ✳
                    </div>
                    <div className="h-px bg-white/35 w-14" />
                    <div className="rounded-full border border-white/30 w-12 h-12 grid place-items-center text-xl">
                      ◎
                    </div>
                    <div className="h-px bg-white/35 w-14" />
                    <div className="rounded-full border border-white/30 w-12 h-12 grid place-items-center text-xl">
                      ◌
                    </div>
                  </div>
                  <h2 className="mt-8 text-lg md:text-2xl font-medium tracking-tight">
                    The cell: Structure and function
                  </h2>
                  <p className="text-white/55 text-xs mt-2">
                    Source video not connected in this demo
                  </p>
                </div>
                <div className="px-5 py-3 bg-[#1a2421] flex items-center gap-4 text-white">
                  <button
                    onClick={() => setPlaying(!playing)}
                    aria-label={playing ? "Pause preview" : "Play preview"}
                    className="hover:text-[#b2dbc7]"
                  >
                    {playing ? (
                      <span className="font-bold">Ⅱ</span>
                    ) : (
                      <Play size={16} fill="currentColor" />
                    )}
                  </button>
                  <span className="text-xs tabular-nums text-white/80">
                    {time} / 18:42
                  </span>
                  <input
                    aria-label="Seek video timeline"
                    type="range"
                    min="0"
                    max="1122"
                    value={seconds(time)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setTime(
                        `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`,
                      );
                    }}
                    className="flex-1 accent-[#66b48b]"
                  />
                  <span className="text-xs text-white/50 hide-phone">
                    Preview timeline
                  </span>
                </div>
              </div>
              <div className="mt-7">
                <div
                  role="tablist"
                  aria-label="Study material"
                  className="border-b border-[var(--line)] flex gap-2 md:gap-7 overflow-x-auto whitespace-nowrap"
                >
                  {tabs.map((t) => (
                    <button
                      role="tab"
                      aria-selected={tab === t}
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-2 py-4 text-sm font-semibold border-b-2 ${tab === t ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent muted hover:text-[var(--ink)]"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {tab === "Tutor" ? (
                  <section className="card mt-6 overflow-hidden">
                    <div className="p-5 border-b border-[var(--line)] flex flex-wrap items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#eaf4ed] grid place-items-center text-[var(--accent)]">
                        <MessageCircle size={18} />
                      </div>
                      <div>
                        <h2 className="font-semibold">Your study tutor</h2>
                        <div className="muted text-xs">
                          Ask questions about this lesson
                        </div>
                      </div>
                      <span className="tag ml-auto">
                        <ShieldCheck size={13} /> Grounded in this video
                      </span>
                    </div>
                    <div
                      className="p-5 md:p-7 space-y-5 min-h-[290px] max-h-[460px] overflow-y-auto"
                      aria-live="polite"
                    >
                      {chat.map((m, i) => (
                        <div
                          key={i}
                          className={`flex ${m.role === "me" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-xl p-4 ${m.role === "me" ? "bg-[#eaf4ed]" : "bg-[#f6f8f6]"}`}
                          >
                            {m.role === "tutor" && (
                              <div className="mb-2 text-xs font-semibold text-[var(--accent)] flex items-center gap-1">
                                {m.general
                                  ? "General knowledge"
                                  : "Grounded in this video"}
                              </div>
                            )}
                            <p className="leading-6">{m.text}</p>
                            {m.time && (
                              <div className="mt-3">{timeLink(m.time)}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {chat.length === 1 && (
                      <div className="px-5 md:px-7 pb-4 flex flex-wrap gap-2">
                        {[
                          "What does the nucleus do?",
                          "How do cells get energy?",
                        ].map((v) => (
                          <button
                            key={v}
                            className="btn btn-quiet !min-h-0 !py-2 text-xs"
                            onClick={() => ask(v)}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        ask();
                      }}
                      className="p-4 border-t border-[var(--line)] flex gap-2"
                    >
                      <input
                        aria-label="Ask the tutor"
                        className="field"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask a question about this video..."
                      />
                      <button
                        type="submit"
                        aria-label="Send question"
                        className="btn btn-primary"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </section>
                ) : tab === "MCQ" ? (
                  <section className="mt-7">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <div className="eyebrow mb-1">Practice</div>
                        <h2 className="text-xl font-semibold">
                          Check your understanding
                        </h2>
                      </div>
                      <span className="tag">
                        Score {score} / {Object.keys(answers).length}
                      </span>
                    </div>
                    <div className="card p-5 md:p-8">
                      <div className="flex justify-between muted text-xs mb-6">
                        <span>
                          Question {qIndex + 1} of {questions.length}
                        </span>
                        <span>Source {timeLink(q.time)}</span>
                      </div>
                      <h3 className="text-xl font-semibold tracking-tight mb-6">
                        {q.question}
                        {qVersion[q.id] ? " Select the best answer." : ""}
                      </h3>
                      <div className="space-y-2">
                        {q.options.map((o, i) => {
                          const selected = answers[q.id] === i,
                            correct = i === q.answer;
                          const state = answered
                            ? correct
                              ? "border-[#8fc5a8] bg-[#eff8f1]"
                              : selected
                                ? "border-[#e5aaa4] bg-[#fff3f2]"
                                : "border-[var(--line)] bg-white"
                            : "border-[var(--line)] bg-white hover:border-[#96bea5]";
                          return (
                            <button
                              key={o}
                              disabled={answered}
                              onClick={() =>
                                setAnswers({ ...answers, [q.id]: i })
                              }
                              className={`w-full text-left border rounded-lg p-4 flex items-center gap-3 ${state}`}
                            >
                              <span className="border border-current/20 w-7 h-7 rounded-full grid place-items-center text-xs flex-none">
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span className="flex-1">{o}</span>
                              {answered && correct && (
                                <span className="flex items-center gap-1 text-xs text-[#247754] font-semibold">
                                  <Check size={17} /> Correct
                                </span>
                              )}
                              {answered && selected && !correct && (
                                <span className="flex items-center gap-1 text-xs text-[#b64e47] font-semibold">
                                  <X size={17} /> Incorrect
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <div className="mt-6 p-4 rounded-lg bg-[#f5f8f6]">
                          <div className="font-semibold mb-2">
                            Why this answer?
                          </div>
                          <p className="muted leading-6">{q.explanation}</p>
                          <div className="mt-3 text-xs">
                            Check the source: {timeLink(q.time)}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between gap-3 mt-7">
                        <button
                          className="btn btn-quiet"
                          disabled={qIndex === 0}
                          onClick={() => setQIndex(qIndex - 1)}
                        >
                          Previous
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            if (qIndex < questions.length - 1)
                              setQIndex(qIndex + 1);
                            else {
                              setQIndex(0);
                              setAnswers({});
                            }
                          }}
                        >
                          {qIndex === questions.length - 1
                            ? "Practice again"
                            : "Next question"}{" "}
                          <ChevronRight size={15} />
                        </button>
                      </div>
                      <button
                        className="icon-btn text-xs mt-3"
                        onClick={() => {
                          setQVersion({
                            ...qVersion,
                            [q.id]: (qVersion[q.id] ?? 0) + 1,
                          });
                          setAnswers((prev) => {
                            const next = { ...prev };
                            delete next[q.id];
                            return next;
                          });
                        }}
                      >
                        <RefreshCw size={12} /> Regenerate question
                      </button>
                    </div>
                  </section>
                ) : (
                  <section className="mt-8">
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div>
                        <div className="eyebrow mb-2">
                          {tab === "Summary" ? "Start here" : "Study material"}
                        </div>
                        <h2 className="text-[22px] font-semibold tracking-tight">
                          {tab === "Summary" ? "A quick understanding" : tab}
                        </h2>
                        <p className="muted mt-1">
                          {tab === "Summary"
                            ? "The essentials, linked to the source video."
                            : tab === "Notes"
                              ? "Key concepts you can edit and make your own."
                              : "High-yield points for revision."}
                        </p>
                      </div>
                      <span className="tag whitespace-nowrap">
                        {blocks[tab].length} points
                      </span>
                    </div>
                    <div className="space-y-3">
                      {blocks[tab].map((b, i) => (
                        <article key={b.id} className="card px-5 md:px-7 py-5">
                          <div className="flex items-start gap-4">
                            <div className="w-7 h-7 rounded-md bg-[#eaf4ed] text-[var(--accent)] grid place-items-center font-semibold text-xs flex-none mt-0.5">
                              {String(i + 1).padStart(2, "0")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-[15px] mb-2">
                                {b.heading}
                              </h3>
                              {editing === b.id ? (
                                <div>
                                  <textarea
                                    aria-label={`Edit ${b.heading}`}
                                    className="field min-h-24"
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      className="btn btn-primary !py-1"
                                      onClick={() => updateBlock(b.id, draft)}
                                    >
                                      Save note
                                    </button>
                                    <button
                                      className="btn btn-quiet !py-1"
                                      onClick={() => setEditing(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="muted leading-6">{b.text}</p>
                              )}
                              <div className="mt-4 flex items-center flex-wrap gap-x-4 gap-y-2">
                                {timeLink(b.time)}
                                <button
                                  onClick={() => edit(b)}
                                  className="icon-btn text-xs"
                                >
                                  <Edit3 size={12} /> Edit
                                </button>
                                <button
                                  disabled={regen === b.id}
                                  onClick={() => regenerate(b.id)}
                                  className="icon-btn text-xs"
                                >
                                  <RefreshCw
                                    size={12}
                                    className={
                                      regen === b.id ? "animate-spin" : ""
                                    }
                                  />
                                  {regen === b.id
                                    ? "Regenerating..."
                                    : "Regenerate"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                    <p className="text-xs muted mt-5">
                      AI-generated demo content. Check the linked video moment
                      before relying on a point.
                    </p>
                  </section>
                )}
              </div>
            </div>
            <aside className="hidden xl:block sticky top-6">
              <StudyScene compact />
              <div className="card p-5 mt-4">
                <div className="eyebrow mb-3">Your study path</div>
                <h3 className="font-semibold text-[17px] tracking-tight mb-4">
                  One video, many ways to learn
                </h3>
                <div className="space-y-4 text-sm">
                  <div className="flex gap-3">
                    <span className="text-[var(--accent)]">✓</span>
                    <div>
                      <b>Watch & understand</b>
                      <p className="muted text-xs mt-1">
                        Go back to the exact moment.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[var(--accent)]">✓</span>
                    <div>
                      <b>Make it yours</b>
                      <p className="muted text-xs mt-1">
                        Edit or regenerate your notes.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[var(--accent)]">✓</span>
                    <div>
                      <b>Test yourself</b>
                      <p className="muted text-xs mt-1">
                        Practice with source-linked MCQs.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="divider my-6" />
                <button
                  onClick={() => setTab("MCQ")}
                  className="w-full btn btn-quiet"
                >
                  Try a quick question <ChevronRight size={14} />
                </button>
              </div>
            </aside>
          </div>
        </main>
        <div className="workspace-footer px-4 py-3 bg-white border-t border-[var(--line)]">
          <div className="max-w-[1148px] mx-auto relative">
            <div className="flex items-center gap-3 bg-[#f7f9f7] border border-[#dfe6e0] rounded-xl px-4">
              <Search size={17} className="muted flex-none" />
              <input
                value={search}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchOpen(false);
                }}
                placeholder="Search this video’s transcript and notes..."
                aria-label="Search transcript and notes"
                className="min-w-0 w-full bg-transparent py-3 outline-none"
              />
              <span className="text-xs muted whitespace-nowrap hide-phone">
                Transcript + notes
              </span>
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setSearchOpen(false);
                  }}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {searchOpen && search && (
              <div
                className="absolute bottom-[55px] left-0 right-0 card shadow-sm max-h-72 overflow-y-auto p-2"
                role="listbox"
                aria-label="Search results"
              >
                {results.length ? (
                  results.map((r, i) => (
                    <button
                      key={`${r.kind}-${i}`}
                      onClick={() => {
                        jump(r.time);
                        setSearchOpen(false);
                      }}
                      className="w-full hover text-left p-3 rounded-lg flex gap-3 items-start"
                    >
                      <span className="text-xs link-accent whitespace-nowrap">
                        {r.time}
                      </span>
                      <span className="min-w-0">
                        <strong className="text-xs">
                          {r.kind} · {r.heading}
                        </strong>
                        <span className="block muted text-xs mt-1 truncate">
                          {r.text}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="muted text-sm p-4">
                    No matches in transcript or notes.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
