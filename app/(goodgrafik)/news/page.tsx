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

      <p className="mt-8 px-1 text-xs font-bold uppercase tracking-wide text-white/30">Desks</p>
      <div className="mt-3">
        <ReservedSectionList world={world} sections={NEWS_SECTIONS} />
      </div>

      <div className="mt-8">
        <InProductionPanel
          world={world}
          title="Top Stories are coming to GoodGrafik"
          description="Breaking news, sports, culture, politics, economy and world coverage — each desk above is reserved and will open progressively with real editorial content."
        />
      </div>
    </main>
  );
}
