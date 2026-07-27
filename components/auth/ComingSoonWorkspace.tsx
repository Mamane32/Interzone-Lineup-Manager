import { Construction } from "lucide-react";
import { unifiedSignOut } from "@/app/login/actions";
import Button from "@/components/ui/Button";
import type { Profile } from "@/lib/types";

export default function ComingSoonWorkspace({
  roleLabel,
  profile,
}: {
  roleLabel: string;
  profile: Profile | null;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#05070a] px-4 text-center text-white">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white/40">
        <Construction size={24} />
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-white/30">{roleLabel} Workspace</p>
        <h1 className="mt-1 font-display text-xl font-semibold">Coming soon</h1>
        <p className="mt-2 max-w-xs text-sm text-white/40">
          You&apos;re signed in{profile?.email ? ` as ${profile.email}` : ""} with {roleLabel.toLowerCase()} access.
          This workspace is still being built.
        </p>
      </div>
      <form action={unifiedSignOut}>
        <Button type="submit" variant="ghost" size="md">
          Sign out
        </Button>
      </form>
    </main>
  );
}
