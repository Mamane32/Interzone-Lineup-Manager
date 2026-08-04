"use client";

import AppShell from "@/components/shell/AppShell";
import { ADMIN_NAVIGATION } from "@/components/shell/admin-navigation";

export default function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: string; avatarUrl?: string | null };
}) {
  return (
    <AppShell nav={ADMIN_NAVIGATION} workspaceLabel="Platform Administration" user={user}>
      {children}
    </AppShell>
  );
}
