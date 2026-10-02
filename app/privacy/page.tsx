import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Knowverse handles account information, video sources and study content.",
};
export default function Privacy() {
  return (
    <main className="legal-page">
      <div className="max-w-3xl mx-auto px-6 py-12 leading-7">
        <Link href="/" className="link-accent">
          Knowverse home
        </Link>
        <h1 className="text-3xl font-semibold mt-8 mb-2">Privacy</h1>
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
            <h2 className="text-xl font-semibold">What the app uses</h2>
            <p>
              When you sign up, the service stores your email and a password
              hash. It stores notebooks, the video links or uploaded files you
              add, captions and transcripts, generated study materials, your
              edits and notes, and messages you send to the study tutor. An
              authentication token is stored in your browser&apos;s local
              storage so you can stay signed in. The app does not currently
              offer Google sign-in.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">How it works</h2>
            <p>
              This information is used to provide the study workspace and
              generate video-based materials. The app fetches public YouTube
              video information and captions when possible; YouTube may block
              automated access. Uploaded files and generated content are stored
              on the service&apos;s backend. AI providers may receive source
              text or media needed to generate transcripts and study content. Do
              not upload information you do not have permission to use.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">
              Storage and outside services
            </h2>
            <p>
              The website is hosted on GitHub Pages; the API and background
              worker are hosted separately. Database, queue, file storage and AI
              services process information needed to run the app. YouTube
              handles videos viewed through its player under its own policies.
              These services may keep technical logs or backups under their own
              policies. This site does not currently install a visitor-analytics
              tracker or an advertising cookie banner. An authentication token
              is stored in local storage, not in a site analytics cookie.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">
              Access, requests and retention
            </h2>
            <p>
              Your account limits access to your notebooks and study materials.
              There is no self-service account deletion control at present. To
              request access, correction or deletion of your account and study
              data, email{" "}
              <a
                className="link-accent"
                href="mailto:deepaktiwari.cybersec@gmail.com"
              >
                deepaktiwari.cybersec@gmail.com
              </a>
              . We will verify the request before acting and explain any data
              that cannot be removed immediately from external provider logs or
              backups. Do not send your password in email. Retention periods
              have not been set; contact us to request deletion.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Security and changes</h2>
            <p>
              The public website and API use HTTPS. We use account
              authentication, but no internet service can promise absolute
              security. We may update this page as the product and its data
              handling change.
            </p>
          </section>
        </div>
        <p className="mt-10">
          <Link href="/terms" className="link-accent">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
