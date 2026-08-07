import { WORLDS } from "@/components/goodgrafik/worlds";
import { CULTURE_SECTIONS } from "@/components/goodgrafik/reserved-sections";
import WorldHero from "@/components/goodgrafik/WorldHero";
import ReservedSectionNav from "@/components/goodgrafik/ReservedSectionNav";
import ReservedSectionGrid from "@/components/goodgrafik/ReservedSectionGrid";
import InProductionPanel from "@/components/goodgrafik/InProductionPanel";

export const metadata = { title: "Culture" };

const world = WORLDS.find((w) => w.id === "culture")!;

export default function CultureHomePage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <WorldHero world={world} />

      <div className="mt-6">
        <ReservedSectionNav world={world} sections={CULTURE_SECTIONS} />
      </div>

      <div className="mt-8">
        <ReservedSectionGrid world={world} sections={CULTURE_SECTIONS} />
      </div>

      <div className="mt-10">
        <InProductionPanel
          world={world}
          title="Culture ap vini sou GoodGrafik"
          description="Pwofil atis ak gwoup, konsè ak festival, mizik, videyo, entèvyou ak atik — chak seksyon anwo a rezève e li pral louvri ti kras pa ti kras. Vrè atis ak gwoup (ak vrè done) ap ranplase eta sa a pandan Culture ap devlope."
        />
      </div>
    </main>
  );
}
