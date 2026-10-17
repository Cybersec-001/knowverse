"use client";
import { useState, useSyncExternalStore } from "react";

const KEY = "knowverse-storage-notice-ok";

function subscribe() {
  return () => {};
}
function readDismissed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}
function readDismissedServer() {
  return true;
}

export function CookieNotice() {
  const dismissed = useSyncExternalStore(
    subscribe,
    readDismissed,
    readDismissedServer
  );
  const [closed, setClosed] = useState(false);
  if (dismissed || closed) return null;
  return (
    <div className="storage-notice" role="note">
      <p>
        Knowverse uses only essential browser storage for sign-in and theme.
        No ads or tracking cookies. Details on the{" "}
        <a href="/privacy" className="link-accent">
          Privacy page
        </a>
        .
      </p>
      <button
        className="btn btn-primary storage-notice-btn"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* ignore */
          }
          setClosed(true);
        }}
      >
        Got it
      </button>
    </div>
  );
}
