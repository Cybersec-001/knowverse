import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import Link from "next/link";
import { LandingNav } from "@/components/LandingNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  BookOpen,
  MessageSquare,
  ScanText,
  Check,
  Link2,
  Sparkles,
  GraduationCap,
} from "lucide-react";
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link href="/" className="brand-link">
          <Brand />
        </Link>
        <LandingNav />
      </header>
      <main>
        <section className="landing-hero">
          <div>
            <Badge>
              <Sparkles size={12} /> For students who learn from video
            </Badge>
            <h1>
              Turn lesson videos
              <br />
              into <span>study notes.</span>
            </h1>
            <p>
              Paste a YouTube link or a caption file. Get a summary, editable
              notes, exam notes, practice questions, and a tutor that answers
              from the video itself. Less replaying. More understanding.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start learning <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="glass">
                <a href="#workspace-preview">
                  Explore the workspace <ArrowRight size={16} />
                </a>
              </Button>
            </div>
            <div className="hero-foot">
              <span>
                <Check size={13} className="inline mr-1" />
                Source-linked notes
              </span>
              <span>
                <Check size={13} className="inline mr-1" />
                Your own study space
              </span>
            </div>
          </div>
          <figure className="demo-frame" id="workspace-preview">
            <video
              className="demo-video"
              src={`${base}/demo/knowverse-demo.mp4`}
              poster={`${base}/demo/poster.jpg`}
              width={960}
              height={540}
              muted
              loop
              playsInline
              autoPlay
              controls
              preload="metadata"
              aria-label="Demo video: a tour of Knowverse notebooks, study workspace and tutor"
            />
            <figcaption>Demo tour of the app. Sample lesson, not a processed video.</figcaption>
          </figure>
        </section>
        <section id="how-it-works" className="landing-features" style={{ paddingTop: 12 }}>
          <span className="eyebrow">A better way to study</span>
          <h2 className="mt-3">One lesson. A whole learning space.</h2>
          <div className="bento">
            {[
              {
                Icon: ScanText,
                title: "Stay close to the source",
                text: "Search source passages and jump back to timestamped moments in your video.",
                cls: "bento-wide",
              },
              {
                Icon: BookOpen,
                title: "Make the ideas your own",
                text: "Edit summaries, keep personal notes and take your study materials with you.",
                cls: "",
              },
              {
                Icon: MessageSquare,
                title: "Go beyond the first answer",
                text: "Ask your tutor, review exam notes and test your understanding with practice questions.",
                cls: "",
              },
            ].map(({ Icon, title, text, cls }) => (
              <article key={title} className={cls}>
                {cls && (
                  <div className="bento-visual" aria-hidden="true">
                    <span><b>02:14</b> Mitochondria produce most of the cell&apos;s ATP</span>
                    <span><b>05:41</b> The nucleus stores the genetic code</span>
                    <span><b>09:03</b> Ribosomes build proteins from RNA</span>
                  </div>
                )}
                <Icon size={24} className="link-accent" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <p className="muted text-xs mt-10">
            YouTube access and free AI limits can affect processing. Caption
            uploads are available as a fallback. This preview is illustrative,
            not a processed lesson.
          </p>
        </section>
        <section className="landing-steps">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-3">Three steps from video to exam-ready.</h2>
          <ol>
            {[
              { Icon: Link2, n: "01", t: "Paste a link", d: "Drop in a YouTube link, or upload a caption file as a fallback." },
              { Icon: Sparkles, n: "02", t: "Get your study pack", d: "A summary, editable notes, exam notes and practice questions appear in one notebook." },
              { Icon: GraduationCap, n: "03", t: "Study and ask", d: "Check answers against timestamps and ask the tutor about anything in the lesson." },
            ].map(({ Icon, n, t, d }) => (
              <li key={n}>
                <span className="step-n">{n}</span>
                <Icon size={20} className="link-accent" />
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="landing-faq">
          <span className="eyebrow">Questions</span>
          <h2 className="mt-3">Before you start</h2>
          <Accordion type="single" collapsible defaultValue="q1">
            {[
              { q: "What can I turn into notes?", a: "A public YouTube lesson link, or a caption file (.vtt, .srt or .txt) that you upload." },
              { q: "Why can a link sometimes fail?", a: "YouTube can block access for some videos. When that happens, upload the caption file and Knowverse works from that instead." },
              { q: "Is it free?", a: "Knowverse runs on free AI tiers, so very long videos can be slow or hit limits." },
              { q: "Are the notes always right?", a: "Notes are AI generated. Use the timestamps to check them against the video before an exam." },
            ].map(({ q, a }, i) => (
              <AccordionItem key={q} value={`q${i + 1}`}>
                <AccordionTrigger>{q}</AccordionTrigger>
                <AccordionContent>{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>
    </div>
  );
}
