"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ImageUpload from "@/components/ui/ImageUpload";
import { NEWS_CATEGORIES } from "@/lib/news-categories";
import type { NewsArticle } from "@/lib/news";
import { uploadNewsCoverImage } from "@/app/media/actions";

/** Create/edit form for one article — shared by NewsExplorer's "New Article" and "Edit" drawers. The surrounding <form action={...}> (createNewsArticle or updateNewsArticle.bind(null, id)) does the actual save; this only renders fields. */
export default function NewsArticleForm({ article, competitions }: { article?: NewsArticle; competitions: { id: string; name: string }[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Input id="title" name="title" label="Title" defaultValue={article?.title ?? ""} required tone="dark" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select id="category" name="category" label="Category" tone="dark" defaultValue={article?.category ?? "general"}>
          {NEWS_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select id="competitionId" name="competitionId" label="Competition (optional)" tone="dark" defaultValue={article?.competitionId ?? ""}>
          <option value="">None</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <Input id="authorName" name="authorName" label="Author (optional)" defaultValue={article?.authorName ?? ""} tone="dark" />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="excerpt" className="text-sm font-medium text-white/45">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          defaultValue={article?.excerpt ?? ""}
          rows={2}
          className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-sm text-white transition-all placeholder:text-white/25 focus:border-brand-400/60 focus:bg-white/[0.05] focus:outline-none"
          placeholder="A one or two sentence summary shown in article cards."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-sm font-medium text-white/45">
          Body
        </label>
        <textarea
          id="body"
          name="body"
          defaultValue={article?.body ?? ""}
          rows={10}
          required
          className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-sm text-white transition-all placeholder:text-white/25 focus:border-brand-400/60 focus:bg-white/[0.05] focus:outline-none"
          placeholder="The full article. Plain text, one paragraph per line."
        />
      </div>

      <ImageUpload action={uploadNewsCoverImage} currentUrl={article?.coverImageUrl ?? null} name="coverImageUrl" label="Cover image" helperText="Shown on article cards and the reader page." />

      <label className="flex items-center gap-2.5 text-sm text-white/70">
        <input type="checkbox" name="featured" defaultChecked={article?.featured ?? false} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-brand-400" />
        Featured on the News Center hub
      </label>

      <Button type="submit" className="w-fit">
        {article ? "Save changes" : "Create article"}
      </Button>
    </div>
  );
}
