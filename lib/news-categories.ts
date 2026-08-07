/**
 * News Center's fixed category set — matches migration 033's
 * `news_articles_category_check` constraint exactly. Plain, un-gated data
 * (no "server-only"), since it's read by admin forms, public category
 * tabs, and client components alike.
 */
export const NEWS_CATEGORIES: { id: string; label: string }[] = [
  { id: "general", label: "General" },
  { id: "match-report", label: "Rapò Match" },
  { id: "transfer", label: "Transfè" },
  { id: "interview", label: "Entèvyou" },
  { id: "announcement", label: "Anons" },
];

export function newsCategoryLabel(id: string): string {
  return NEWS_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
