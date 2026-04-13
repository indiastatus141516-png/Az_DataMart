import React from "react";
import { Outlet, Link } from "react-router-dom";

const highlights = [
  { label: "Active vendors", value: "248" },
  { label: "Data catalogs", value: "86" },
  { label: "Secure requests", value: "1.4k" },
];

const AuthShell = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-16 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-24 bottom-16 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.2)_0%,_transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <aside className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
            Dmart Ui
          </div>
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              A modern CRM hub built for fast-moving data teams.
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-300">
              Monitor purchase flows, keep inventories synced, and share data
              securely from one streamlined cockpit.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              Compliance ready
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              Role-based access
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              Live purchase signals
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Looking for docs?{" "}
            <Link className="text-cyan-300 underline-offset-4 hover:underline" to="/login">
              Sign in to continue
            </Link>
          </div>
        </aside>

        <main className="flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.55)] backdrop-blur">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthShell;
