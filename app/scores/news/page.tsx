import Link from "next/link";
import { Newspaper, Search, Star } from "lucide-react";
import { listPublicNews, searchPublicNews } from "@/lib/public-news";
import { getPublicScoresFeed } from "@/lib/public-scores";
import { NEWS_CATEGORIES } from "@/lib/news-categories";
import NewsCard from "@/components/scores/NewsCard";
import PublicNav from "@/components/scores/PublicNav";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function NewsCenterPage({ searchParams }: { searchParams: { category?: string; q?: string } }) {
  const query = searchParams.q?.trim();
  const [articles, featured, feed] = await Promise.all([
    query ? searchPublicNews(query) : listPublicNews({ category: searchParams.category }),
    query ? Promise.resolve([]) : listPublicNews({ featuredOnly: true, limit: 8 }),
    getPublicScoresFeed(),
  ]);

  return (
    <div className="min-h-screen bg-surface-950 pb-28 text-white">
      <header className="border-b border-white/[0.06] bg-surface-950/90 px-5 pb-5 pt-7 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">GGScoreLive</p>
          <h1 className="mt-1.5 font-display text-2xl font-black tracking-tight">Nouvèl</h1>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-5">
        <form action="/scores/news" method="get" className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              name="q"
              defaultValue={query ?? ""}
              placeholder="Chèche yon atik…"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 text-sm text-white placeholder:text-white/25 focus:border-brand-400/60 focus:outline-none"
            />
          </div>
        </form>

        {!query && featured.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <Star size={14} className="fill-amber-signal text-amber-signal" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wide">Istwa Enpòtan</h2>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {featured.map((a) => (
                <NewsCard key={a.id} article={a} featured />
              ))}
            </div>
          </section>
        )}

        {!query && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
            <Link
              href="/scores/news"
              className={`flex-none rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                !searchParams.category ? "border-brand-400/60 bg-brand-400/15 text-brand-400" : "border-white/[0.08] text-white/50 hover:text-white"
              }`}
            >
              Tout
            </Link>
            {NEWS_CATEGORIES.map((c) => (
              <Link
                key={c.id}
                href={`/scores/news?category=${c.id}`}
                className={`flex-none whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  searchParams.category === c.id ? "border-brand-400/60 bg-brand-400/15 text-brand-400" : "border-white/[0.08] text-white/50 hover:text-white"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        )}

        {articles.length === 0 ? (
          <EmptyState compact icon={Newspaper} title="Anyen isit la" description={query ? `Pa gen rezilta pou "${query}".` : "Pa gen atik pou kounye a."} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {articles.map((a) => (
              <NewsCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </main>

      <PublicNav active="news" hasLive={feed.live.length > 0} />
    </div>
  );
}
