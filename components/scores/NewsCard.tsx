import Link from "next/link";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { newsCategoryLabel } from "@/lib/news-categories";
import type { PublicNewsArticle } from "@/lib/public-news";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** One article preview — used by the News Center hub's grid and (in `featured` mode) its Featured Stories rail. */
export default function NewsCard({ article, featured = false }: { article: PublicNewsArticle; featured?: boolean }) {
  return (
    <Link
      href={`/scores/news/${article.slug}`}
      className={`surface-panel flex flex-none flex-col overflow-hidden transition hover:border-brand-400/25 ${featured ? "w-64" : "w-full"}`}
    >
      <div className={`relative flex items-center justify-center overflow-hidden bg-white/[0.03] ${featured ? "h-32" : "h-40"}`}>
        {article.coverImageUrl ? (
          <Image src={article.coverImageUrl} alt="" fill sizes="256px" className="object-cover" unoptimized />
        ) : (
          <Newspaper size={24} className="text-white/15" />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-surface-950/85 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-400 backdrop-blur">
          {newsCategoryLabel(article.category)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <p className={`font-display font-bold leading-snug text-white ${featured ? "text-sm" : "text-base"}`}>{article.title}</p>
        {!featured && article.excerpt && <p className="line-clamp-2 text-xs leading-5 text-white/45">{article.excerpt}</p>}
        <p className="mt-auto pt-1 text-[10px] font-medium uppercase tracking-wide text-white/30">
          {formatDate(article.publishedAt)}
          {article.authorName ? ` · ${article.authorName}` : ""}
        </p>
      </div>
    </Link>
  );
}
