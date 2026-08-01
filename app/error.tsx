"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="mb-12 flex justify-center"><BrandMark size="lg" /></div>
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/15 bg-red-400/[0.07] text-red-300"><TriangleAlert size={27} /></span>
        <p className="eyebrow mt-7">Something went wrong</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">We couldn&apos;t load this view.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/40">Your data is safe. Try the request again, or return to the platform home.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-400 px-5 text-sm font-semibold text-surface-950 transition hover:bg-brand-100"><RefreshCw size={15} /> Try again</button>
          <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-white/10 px-5 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white">Platform home</Link>
        </div>
        {error.digest && (
          <p className="mt-8 text-[11px] text-white/25">
            Error reference: <code className="text-white/40">{error.digest}</code> — share this if you contact support.
          </p>
        )}
      </div>
    </main>
  );
}
