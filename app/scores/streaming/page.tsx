import { Radio, Tv } from "lucide-react";
import { getPublicStreamingHub, type PublicBroadcast } from "@/lib/public-streaming";
import { getPublicScoresFeed } from "@/lib/public-scores";
import BroadcastCard from "@/components/scores/BroadcastCard";
import PublicNav from "@/components/scores/PublicNav";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function StreamingPage() {
  const [hub, feed] = await Promise.all([getPublicStreamingHub(), getPublicScoresFeed()]);
  const hasAnyBroadcast = hub.live.length + hub.upcoming.length + hub.replays.length + hub.featured.length > 0;

  return (
    <div className="min-h-screen bg-surface-950 pb-28 text-white">
      <header className="border-b border-white/[0.06] bg-surface-950/90 px-5 pb-6 pt-8 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">GGScoreLive</p>
          <h1 className="mt-2 font-display text-2xl font-black tracking-tight">Streaming</h1>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6">
        {!hasAnyBroadcast ? (
          <EmptyState compact icon={Tv} title="Pa gen stream pou kounye a" description="Match k ap difize an dirèk yo ap parèt isit la." />
        ) : (
          <>
            {hub.live.length > 0 && (
              <BroadcastSection icon={<Radio size={14} className="text-red-400" />} title="Live Kounye A" broadcasts={hub.live} />
            )}
            {hub.featured.length > 0 && <BroadcastSection title="Featured Broadcasts" broadcasts={hub.featured} />}
            {hub.upcoming.length > 0 && <BroadcastSection title="Pwochen Stream" broadcasts={hub.upcoming} />}
            {hub.replays.length > 0 && <BroadcastSection title="Replay" broadcasts={hub.replays} />}
          </>
        )}
      </main>

      <PublicNav active="home" hasLive={feed.live.length > 0} />
    </div>
  );
}

function BroadcastSection({
  icon,
  title,
  broadcasts,
}: {
  icon?: React.ReactNode;
  title: string;
  broadcasts: PublicBroadcast[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        {icon}
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">{title}</h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {broadcasts.map((b) => (
          <BroadcastCard key={`${title}-${b.matchId}`} broadcast={b} />
        ))}
      </div>
    </section>
  );
}
