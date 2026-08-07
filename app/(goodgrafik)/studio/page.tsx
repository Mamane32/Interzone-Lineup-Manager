import { Radio } from "lucide-react";
import { WORLDS, ACCENT_CLASSES } from "@/components/goodgrafik/worlds";
import { STUDIO_SECTIONS } from "@/components/goodgrafik/reserved-sections";
import WorldHero from "@/components/goodgrafik/WorldHero";
import ReservedSectionNav from "@/components/goodgrafik/ReservedSectionNav";
import ReservedSectionGrid from "@/components/goodgrafik/ReservedSectionGrid";
import InProductionPanel from "@/components/goodgrafik/InProductionPanel";

export const metadata = { title: "Studio" };

const world = WORLDS.find((w) => w.id === "studio")!;
const accent = ACCENT_CLASSES[world.accent];

export default function StudioHomePage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <WorldHero world={world} />

      <div className="mt-6">
        <ReservedSectionNav world={world} sections={STUDIO_SECTIONS} />
      </div>

      <div className={`surface-panel mx-auto mt-8 flex max-w-md items-center justify-center gap-2.5 px-4 py-3 ${accent.border}`}>
        <Radio size={15} className={accent.text} />
        <span className="text-xs font-semibold text-white/60">GoodGrafik Radio — poko sou lè a</span>
      </div>

      <div className="mt-8">
        <ReservedSectionGrid world={world} sections={STUDIO_SECTIONS} />
      </div>

      <div className="mt-10">
        <InProductionPanel
          world={world}
          title="Studio ap vini sou GoodGrafik"
          description="Emisyon orijinal, podcast, pwodiksyon an dirèk, radyo ak videyo — chak seksyon anwo a rezève e li pral louvri ti kras pa ti kras pandan Studio ap devlope."
        />
      </div>
    </main>
  );
}
