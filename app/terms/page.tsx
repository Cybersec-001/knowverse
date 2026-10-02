import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for the Knowverse study application.",
};
export default function Terms() {
  return (
    <main className="legal-page">
      <div className="max-w-3xl mx-auto px-6 py-12 leading-7">
        <Link href="/" className="link-accent">
          Knowverse home
        </Link>
        <h1 className="text-3xl font-semibold mt-8 mb-2">Terms</h1>
        <p className="muted text-sm mb-8">
          Last updated 28 September 2026 · Contact: Deepak Tiwari,{" "}
          <a
            className="link-accent"
            href="mailto:deepaktiwari.cybersec@gmail.com"
          >
            deepaktiwari.cybersec@gmail.com
          </a>
        </p>
        <div className="space-y-7">
          <section>
            <h2 className="text-xl font-semibold">Using Knowverse</h2>
            <p>
              Knowverse is a study tool that builds summaries, notes, exam notes
              and practice questions from video content. You are responsible for
              the videos and files you submit and must have the right to use
              them. Do not use the service to break laws, violate others&apos;
              rights or interfere with the service. Public YouTube links may not
              process when captions are unavailable or YouTube blocks access.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Study output</h2>
            <p>
              Generated material can contain mistakes. Check important facts and
              timestamps against the original video before relying on them,
              especially for exams or other consequential decisions. Your own
              edits are not source-verified. Availability and processing time
              may vary on the free infrastructure.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Accounts and data</h2>
            <p>
              Keep your password private and use the service only through your
              own account. See the{" "}
              <Link href="/privacy" className="link-accent">
                Privacy page
              </Link>{" "}
              for the data the service uses and how to request access or
              deletion. There is not yet a self-service account deletion
              control.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">
              Service changes and contact
            </h2>
            <p>
              The service may change or be unavailable, especially where outside
              video or AI services impose limits. For support or to report a
              problem, contact{" "}
              <a
                className="link-accent"
                href="mailto:deepaktiwari.cybersec@gmail.com"
              >
                deepaktiwari.cybersec@gmail.com
              </a>
              . These terms are governed by the laws of India, subject to
              applicable consumer protections.
            </p>
          </section>
        </div>
        <p className="mt-10">
          <Link href="/" className="link-accent">
            Back to Knowverse
          </Link>
        </p>
      </div>
    </main>
  );
}
