import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { WORLDS } from "@/components/goodgrafik/worlds";
import { NEWS_SECTIONS } from "@/components/goodgrafik/reserved-sections";
import WorldHero from "@/components/goodgrafik/WorldHero";
import ReservedSectionList from "@/components/goodgrafik/ReservedSectionList";
import InProductionPanel from "@/components/goodgrafik/InProductionPanel";

const world = WORLDS.find((w) => w.id === "news")!;

export function generateStaticParams() {
  return NEWS_SECTIONS.map((s) => ({ section: s.key }));
}

export default function NewsSectionPage({ params }: { params: { section: string } }) {
  const section = NEWS_SECTIONS.find((s) => s.key === params.section);
  if (!section) notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <Link href="/news" className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white">
        <ChevronLeft size={14} /> News
      </Link>
      <WorldHero world={world} dense />
      <p className="mt-8 px-1 text-xs font-bold uppercase tracking-wide text-white/30">Lòt seksyon</p>
      <div className="mt-3">
        <ReservedSectionList world={world} sections={NEWS_SECTIONS} />
      </div>
      <div className="mt-8">
        <InProductionPanel world={world} title={section.label} description={section.description} />
      </div>
    </main>
  );
}
