"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const before = document.activeElement as HTMLElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      before?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const els = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input, a[href], select, textarea",
          ) ?? [],
        );
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Skeleton() {
  return (
    <div
      role="status"
      aria-label="Loading your workspace"
      className="skeleton-group"
    >
      <div className="skeleton w-48 h-8" />
      <div className="skeleton h-20" />
      <div className="skeleton h-56" />
      <span className="sr-only">Loading your workspace</span>
    </div>
  );
}
export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="empty-state">
      <div className="eyebrow">Your learning space</div>
      <h1>{title}</h1>
      <p className="muted">{body}</p>
      {children}
    </section>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="error-notice" role="alert">
      <b>Something needs your attention</b>
      <p>{message}</p>
    </div>
  );
}
export function friendlyError(message: string) {
  if (/invalid credentials/i.test(message))
    return "Email or password did not match. Check both and try again.";
  if (/Email already/i.test(message))
    return "This email already has an account. Log in instead.";
  if (/25 MB|full http|Choose|Paste|At least/.test(message)) return message;
  if (/rate|429/i.test(message))
    return "The service is busy. Wait a little, then try again.";
  if (/token|401|auth/i.test(message))
    return "Your session has expired. Log in again.";
  return "We could not finish that request. Try again. If video processing failed, open the video and upload an SRT or VTT transcript.";
}
