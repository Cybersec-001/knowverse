"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Ev = { id: number; email: string; method: string; ip: string | null; created_at: string };
type U = { email: string; created_at: string; last_login: string | null; logins: number };
type Data = { total_users: number; users: U[]; events: Ev[] };

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "never";

export default function AdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Data>("/admin/logins")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }, []);
  return (
    <Shell>
      <main className="page">
        <div className="eyebrow">Owner only</div>
        <h1 className="text-4xl font-semibold mt-3 mb-8">Login history</h1>
        {error && <p className="muted">{error === "Not allowed" ? "This page is only for the site owner." : error}</p>}
        {!data && !error && <p className="muted">Loading...</p>}
        {data && (
          <>
            <p className="muted mb-6">{data.total_users} registered users</p>
            <h2 className="text-xl font-semibold mb-3">Users</h2>
            <div className="overflow-x-auto mb-10">
              <table className="w-full text-sm text-left">
                <thead><tr><th className="py-2">Email</th><th>Joined</th><th>Last login</th><th>Logins</th></tr></thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.email}><td className="py-2">{u.email}</td><td>{fmt(u.created_at)}</td><td>{fmt(u.last_login)}</td><td>{u.logins}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h2 className="text-xl font-semibold mb-3">Recent logins</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead><tr><th className="py-2">When</th><th>Email</th><th>Method</th><th>IP</th></tr></thead>
                <tbody>
                  {data.events.map((e) => (
                    <tr key={e.id}><td className="py-2">{fmt(e.created_at)}</td><td>{e.email}</td><td>{e.method}</td><td>{e.ip ?? ""}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </Shell>
  );
}
