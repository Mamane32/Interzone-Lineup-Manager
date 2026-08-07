import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getPublicNewsBySlug, listPublicNews } from "@/lib/public-news";
import { getPublicScoresFeed } from "@/lib/public-scores";
import { newsCategoryLabel } from "@/lib/news-categories";
import NewsCard from "@/components/scores/NewsCard";
import PublicNav from "@/components/scores/PublicNav";
import GoodGrafikBreadcrumb from "@/components/scores/GoodGrafikBreadcrumb";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default async function NewsArticlePage({ params }: { params: { slug: string } }) {
  const article = await getPublicNewsBySlug(params.slug);
  if (!article) notFound();

  const [related, feed] = await Promise.all([
    listPublicNews({ category: article.category, limit: 4 }),
    getPublicScoresFeed(),
  ]);
  const relatedFiltered = related.filter((a) => a.id !== article.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-surface-950 pb-28 text-white">
      <header className="border-b border-white/[0.06] bg-surface-950/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Link href="/scores/news" className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white">
            <ChevronLeft size={14} /> Nouvèl
          </Link>
          <GoodGrafikBreadcrumb />
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-5">
        {article.coverImageUrl && (
          <div className="surface-panel relative h-56 overflow-hidden p-0">
            <Image src={article.coverImageUrl} alt="" fill sizes="672px" className="object-cover" unoptimized />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="w-fit rounded-full bg-brand-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-400">
            {newsCategoryLabel(article.category)}
          </span>
          <h1 className="text-balance font-display text-2xl font-black leading-tight tracking-tight">{article.title}</h1>
          <p className="text-xs text-white/35">
            {formatDate(article.publishedAt)}
            {article.authorName ? ` · ${article.authorName}` : ""}
            {article.competitionName ? ` · ${article.competitionName}` : ""}
          </p>
        </div>

        <div className="surface-panel flex flex-col gap-4 p-5 text-sm leading-7 text-white/80">
          {article.body.split("\n").filter(Boolean).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {relatedFiltered.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-white/40">Lòt Nouvèl</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {relatedFiltered.map((a) => (
                <NewsCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}
      </main>

      <PublicNav active="news" hasLive={feed.live.length > 0} />
    </div>
  );
}
