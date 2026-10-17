import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy",
  description:
    "How Knowverse handles account information, video sources and study content.",
};
export default function Privacy() {
  return (
    <main className="legal-page">
      <div className="max-w-3xl mx-auto px-6 py-12 leading-7">
        <Link href="/" className="brand-link" aria-label="Knowverse home">
          <Brand />
        </Link>
        <h1 className="text-3xl font-semibold mt-8 mb-2">Privacy</h1>
        <p className="muted text-sm mb-8">
          Last updated 17 October 2026 · Contact: Deepak Tiwari,{" "}
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
              storage so you can stay signed in. If you sign in with Google,
              Google gives the app your name and email address; the app never
              sees your Google password.
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
              The website is hosted on Vercel; the API and background worker
              are hosted separately. Database, queue, file storage and AI
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
              Cookies and local storage
            </h2>
            <p>
              Knowverse uses only essential browser storage to run: your
              sign-in token, your theme choice and your saved notebooks list
              stay in your browser&apos;s local storage. The site does not use
              analytics cookies, advertising cookies or third-party trackers.
              You can clear this storage at any time in your browser settings,
              which signs you out.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">
              Your rights under the DPDP Act 2023
            </h2>
            <p>
              Under India&apos;s Digital Personal Data Protection Act 2023, the
              app processes your personal data with your consent, which you can
              withdraw at any time by emailing us; withdrawal does not affect
              processing already done. You can ask to access, correct or erase
              your personal data, and you can nominate someone to act for you
              if you are unable to. For any grievance about how your data is
              handled, contact Deepak Tiwari at{" "}
              <a
                className="link-accent"
                href="mailto:deepaktiwari.cybersec@gmail.com"
              >
                deepaktiwari.cybersec@gmail.com
              </a>
              ; we will look into it and reply. The service is meant for users
              who are 18 or older; if you are younger, please use it only with
              a parent or guardian&apos;s consent.
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
