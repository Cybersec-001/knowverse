"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton, EmptyState } from "@/components/UI";
import Link from "next/link";
import { NotebookView } from "@/components/NotebookView";
function CurrentNotebook() {
  const id = useSearchParams().get("id");
  return id ? (
    <NotebookView id={id} />
  ) : (
    <EmptyState
      title="Your ideas need a home"
      body="Open a notebook or create one to collect your next lesson."
    >
      <Link className="btn btn-primary" href="/dashboard">
        Open notebooks
      </Link>
    </EmptyState>
  );
}
export default function Notebook() {
  return (
    <Suspense fallback={<Skeleton />}>
      <CurrentNotebook />
    </Suspense>
  );
}
