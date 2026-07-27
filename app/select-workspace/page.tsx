import { redirect } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { getSessionUser, resolveUserDestination } from "@/lib/access";
import { selectWorkspace } from "./actions";
import { unifiedSignOut } from "@/app/login/actions";
import { getBaseBranding } from "@/lib/branding";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function SelectWorkspacePage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const resolution = await resolveUserDestination(user.id);

  // If they only have one option (or none), they shouldn't be here at all —
  // send them where they actually belong instead of showing an empty picker.
  if (resolution.kind === "redirect") redirect(resolution.path);
  if (resolution.kind === "denied") redirect(`/login?error=${resolution.reason}`);

  const branding = getBaseBranding();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070a] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.2em] text-white/40">
            <LayoutGrid size={14} /> Choose your workspace
          </p>
          <h1 className="mt-1 font-display text-xl font-semibold text-white">{branding.organizationName}</h1>
        </div>

        <div className="flex flex-col gap-2">
          {resolution.options.map((o) => (
            <form key={o.assignmentId} action={selectWorkspace}>
              <input type="hidden" name="assignmentId" value={o.assignmentId} />
              <button
                type="submit"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-left transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              >
                <p className="font-display font-semibold text-white">{o.label}</p>
                <p className="text-xs text-white/40">{o.description}</p>
              </button>
            </form>
          ))}
        </div>

        {searchParams.error && (
          <p role="alert" className="mt-3 text-center text-sm font-medium text-red-400">
            That workspace could not be verified. Please choose again.
          </p>
        )}

        <form action={unifiedSignOut} className="mt-6 text-center">
          <Button type="submit" variant="ghost" size="md">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
