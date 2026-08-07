import { WORLDS } from "@/components/goodgrafik/worlds";
import { CULTURE_SECTIONS } from "@/components/goodgrafik/reserved-sections";
import WorldHero from "@/components/goodgrafik/WorldHero";
import ReservedSectionGrid from "@/components/goodgrafik/ReservedSectionGrid";
import InProductionPanel from "@/components/goodgrafik/InProductionPanel";

export const metadata = { title: "Culture" };

const world = WORLDS.find((w) => w.id === "culture")!;

export default function CultureHomePage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <WorldHero world={world} />

      <div className="mt-10">
        <ReservedSectionGrid world={world} sections={CULTURE_SECTIONS} />
      </div>

      <div className="mt-10">
        <InProductionPanel
          world={world}
          title="Culture is coming to GoodGrafik"
          description="Artist and band profiles, concerts and festivals, music, videos, interviews and articles — every section above is reserved and will open progressively. Real artists and bands (with real data) will replace this state as Culture is built out."
        />
      </div>
    </main>
  );
}
