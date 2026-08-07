"use client";

import { useState } from "react";
import { Plus, Star, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Drawer from "@/components/foundation/Drawer";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import ConfirmActionDialog from "@/components/iam/ConfirmActionDialog";
import { newsCategoryLabel } from "@/lib/news-categories";
import type { NewsArticle } from "@/lib/news";
import { createNewsArticle, updateNewsArticle, setNewsArticleStatus, toggleNewsArticleFeatured, deleteNewsArticle } from "@/app/media/actions";
import NewsArticleForm from "./NewsArticleForm";

export default function NewsExplorer({ articles, competitions }: { articles: NewsArticle[]; competitions: { id: string; name: string }[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<NewsArticle | null>(null);

  const columns: DataTableColumn<NewsArticle>[] = [
    {
      key: "title",
      header: "Title",
      cardRole: "title",
      render: (a) => (
        <span className="flex items-center gap-1.5">
          {a.featured && <Star size={13} className="flex-none fill-amber-signal text-amber-signal" />}
          {a.title}
        </span>
      ),
    },
    { key: "category", header: "Category", render: (a) => newsCategoryLabel(a.category) },
    {
      key: "status",
      header: "Status",
      render: (a) => (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.status === "published" ? "bg-status-submitted/10 text-status-submitted" : "bg-white/5 text-white/40"}`}>
          {a.status === "published" ? "Published" : "Draft"}
        </span>
      ),
    },
    { key: "updated", header: "Updated", render: (a) => new Date(a.updatedAt).toLocaleDateString() },
    {
      key: "actions",
      header: "",
      cardRole: "actions",
      render: (a) => (
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" variant="secondary" size="md" className="h-8 px-2.5 text-xs" onClick={() => setEditing(a)}>
            <Pencil size={12} /> Edit
          </Button>
          <Button type="button" variant="secondary" size="md" className="h-8 px-2.5 text-xs" onClick={() => setNewsArticleStatus(a.id, a.status === "published" ? "draft" : "published")}>
            {a.status === "published" ? <EyeOff size={12} /> : <Eye size={12} />} {a.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button type="button" variant="secondary" size="md" className="h-8 px-2.5 text-xs" onClick={() => toggleNewsArticleFeatured(a.id, !a.featured)}>
            <Star size={12} /> {a.featured ? "Unfeature" : "Feature"}
          </Button>
          <ConfirmActionDialog
            triggerLabel="Delete"
            triggerVariant="danger"
            triggerIcon={<Trash2 size={12} />}
            title="Delete this article?"
            body={`"${a.title}" will be permanently removed. This cannot be undone.`}
            confirmLabel="Delete"
            action={() => deleteNewsArticle(a.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus size={15} /> New Article
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={articles}
        rowKey={(a) => a.id}
        empty={{ title: "No articles yet", description: "Create the News Center's first article." }}
      />

      {creating && (
        <Drawer title="New Article" onClose={() => setCreating(false)}>
          <form action={createNewsArticle}>
            <NewsArticleForm competitions={competitions} />
          </form>
        </Drawer>
      )}

      {editing && (
        <Drawer title={editing.title} subtitle="Edit article" onClose={() => setEditing(null)}>
          <form action={updateNewsArticle.bind(null, editing.id)}>
            <NewsArticleForm article={editing} competitions={competitions} />
          </form>
        </Drawer>
      )}
    </div>
  );
}
