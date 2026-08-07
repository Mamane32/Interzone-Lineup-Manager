import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { WORLDS } from "@/components/goodgrafik/worlds";
import { CULTURE_SECTIONS } from "@/components/goodgrafik/reserved-sections";
import WorldHero from "@/components/goodgrafik/WorldHero";
import ReservedSectionNav from "@/components/goodgrafik/ReservedSectionNav";
import InProductionPanel from "@/components/goodgrafik/InProductionPanel";

const world = WORLDS.find((w) => w.id === "culture")!;

export function generateStaticParams() {
  return CULTURE_SECTIONS.map((s) => ({ section: s.key }));
}

export default function CultureSectionPage({ params }: { params: { section: string } }) {
  const section = CULTURE_SECTIONS.find((s) => s.key === params.section);
  if (!section) notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/culture" className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white">
        <ChevronLeft size={14} /> Culture
      </Link>
      <WorldHero world={world} dense />
      <div className="mt-6">
        <ReservedSectionNav world={world} sections={CULTURE_SECTIONS} activeKey={section.key} />
      </div>
      <div className="mt-8">
        <InProductionPanel world={world} title={section.label} description={section.description} />
      </div>
    </main>
  );
}
