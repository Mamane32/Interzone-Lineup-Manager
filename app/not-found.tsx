import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="mb-12 flex justify-center"><BrandMark /></div>
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-400/15 bg-brand-400/[0.07] text-brand-400"><SearchX size={27} /></span>
        <p className="eyebrow mt-7">Error 404</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">This page is off the field.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/40">The destination may have moved, or your workspace may not include it.</p>
        <Link href="/" className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-400 px-5 text-sm font-semibold text-surface-950 transition hover:bg-brand-100"><ArrowLeft size={15} /> Return home</Link>
      </div>
    </main>
  );
}
