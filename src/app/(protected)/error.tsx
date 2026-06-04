"use client";

import Link from "next/link";
import { useEffect } from "react";

type ProtectedErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProtectedError({ error, reset }: ProtectedErrorProps) {
  useEffect(() => {
    console.error("[protected-route-render-error]", {
      digest: error.digest,
      name: error.name,
    });
  }, [error.digest, error.name]);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-sky-700">Calm Wallet</p>
        <h2 className="text-xl font-semibold text-slate-900">We could not load this view.</h2>
        <p className="text-sm leading-6 text-slate-500">
          Your data was not changed. Try again, or return home and reopen the view.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-medium text-white"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/assistant">
          Go home
        </Link>
      </div>
    </section>
  );
}
