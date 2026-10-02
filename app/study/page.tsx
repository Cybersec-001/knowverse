"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Workspace } from "@/components/Workspace";
import { Skeleton, EmptyState } from "@/components/UI";
import Link from "next/link";
import { LiveWorkspace } from "@/components/LiveWorkspace";
function CurrentStudy() {
  const params = useSearchParams(),
    notebookId = params.get("notebook"),
    videoId = params.get("video");
  if (params.get("demo") === "1")
    return (
      <>
        <p className="bg-[var(--accent-soft)] text-center text-xs p-3">
          Offline sample lesson. No video is processed and answers are
          illustrative.
        </p>
        <Workspace />
      </>
    );
  return notebookId && videoId ? (
    <LiveWorkspace notebookId={notebookId} videoId={videoId} />
  ) : (
    <EmptyState
      title="A lesson is waiting to be opened"
      body="Choose a video from your notebook to see its summary, notes and study tools."
    >
      <Link className="btn btn-primary" href="/dashboard">
        Open notebooks
      </Link>
    </EmptyState>
  );
}
export default function Study() {
  return (
    <Suspense fallback={<Skeleton />}>
      <CurrentStudy />
    </Suspense>
  );
}
