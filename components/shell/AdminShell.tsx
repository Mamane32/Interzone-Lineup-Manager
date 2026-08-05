"use client";

import AppShell from "@/components/shell/AppShell";
import { ADMIN_NAVIGATION } from "@/components/shell/admin-navigation";

export default function AdminShell({
  children,
  user,
  branding,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: string; avatarUrl?: string | null };
  /** Platform identity (Settings → Platform branding) — see app/admin/layout.tsx,
   * which reads it via lib/branding.ts's getPlatformBranding() and passes it
   * down here so the GG header never has a name/logo hardcoded in a component. */
  branding?: { orgName: string; subtitle: string; logoUrl: string | null };
}) {
  return (
    <AppShell nav={ADMIN_NAVIGATION} workspaceLabel="Platform Administration" user={user} branding={branding}>
      {children}
    </AppShell>
  );
}
