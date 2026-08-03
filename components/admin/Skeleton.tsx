export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.05] ${className}`} />;
}

/**
 * One generic admin loading state (app/admin/loading.tsx) rather than a
 * page-specific skeleton per route — every /admin/* page renders inside
 * the same AdminShell (sidebar/topbar stay mounted; only this fills the
 * content area), so a single reasonable approximation of "a page with a
 * header and some rows" covers the whole section without needing 20
 * individual loading.tsx files that would each drift out of sync with
 * their page's actual layout.
 */
export function AdminPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 rounded-2xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </div>
  );
}
