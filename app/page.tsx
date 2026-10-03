import { Brand } from "@/components/Brand";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  MessageSquare,
  ScanText,
  Check,
} from "lucide-react";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link href="/" className="brand-link">
          <Brand />
        </Link>
        <nav className="landing-nav" aria-label="Public navigation">
          <a href="#how-it-works">The workspace</a>
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="btn btn-primary">
            Get started <ArrowRight size={14} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div>
            <div className="eyebrow">Your AI learning workspace</div>
            <h1>
              Turn videos
              <br />
              into <span>knowledge.</span>
            </h1>
            <p>
              Paste a video source and transform it into summaries, notes,
              questions, and an interactive learning workspace. Less replaying.
              More understanding.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="btn btn-primary">
                Start learning <ArrowRight size={16} />
              </Link>
              <a href="#workspace-preview" className="btn btn-quiet">
                Explore the workspace <ArrowRight size={16} />
              </a>
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
          <div>
            {[
              {
                Icon: ScanText,
                title: "Stay close to the source",
                text: "Search source passages and jump back to timestamped moments in your video.",
              },
              {
                Icon: BookOpen,
                title: "Make the ideas your own",
                text: "Edit summaries, keep personal notes and take your study materials with you.",
              },
              {
                Icon: MessageSquare,
                title: "Go beyond the first answer",
                text: "Ask your tutor, review exam notes and test your understanding with practice questions.",
              },
            ].map(({ Icon, title, text }) => (
              <article key={title}>
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
      </main>
    </div>
  );
}
