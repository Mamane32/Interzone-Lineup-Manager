import { WORLDS } from "@/components/goodgrafik/worlds";
import { NEWS_SECTIONS } from "@/components/goodgrafik/reserved-sections";
import WorldHero from "@/components/goodgrafik/WorldHero";
import ReservedSectionList from "@/components/goodgrafik/ReservedSectionList";
import InProductionPanel from "@/components/goodgrafik/InProductionPanel";

export const metadata = { title: "News" };

const world = WORLDS.find((w) => w.id === "news")!;

/**
 * News is deliberately laid out as a desk index (ReservedSectionList),
 * not a card grid — an editorial, information-first reading, distinct
 * from Sports/Culture's more visual, browse-a-world treatment. Top
 * Stories is the hub itself, not a separate reserved route.
 */
export default function NewsHomePage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <WorldHero world={world} />

      <p className="mt-8 px-1 text-xs font-bold uppercase tracking-wide text-white/30">Seksyon</p>
      <div className="mt-3">
        <ReservedSectionList world={world} sections={NEWS_SECTIONS} />
      </div>

      <div className="mt-8">
        <InProductionPanel
          world={world}
          title="Gwo Tit yo ap vini sou GoodGrafik"
          description="Nouvèl cho, espò, kilti, politik, ekonomi ak kouvèti mondyal — chak seksyon anwo a rezève e li pral louvri ti kras pa ti kras ak vrè kontni editorial."
        />
      </div>
    </main>
  );
}
