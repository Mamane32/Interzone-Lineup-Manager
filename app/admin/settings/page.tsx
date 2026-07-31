import Image from "next/image";
import {
  Bell,
  Building2,
  CheckCircle2,
  Globe,
  KeyRound,
  Moon,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { requireAdmin, getProfile, getActiveAssignments } from "@/lib/access";
import { updateOwnProfile, changeOwnPassword } from "./actions";
import PageHeader from "@/components/ui/PageHeader";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import RoleBadge from "@/components/iam/RoleBadge";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "security", label: "Security", icon: KeyRound },
  { id: "organization", label: "Organization & Access", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance & Language", icon: Moon },
];

const ERRORS: Record<string, string> = {
  "save-failed": "Could not save your profile. Please try again.",
  short: "Password must be at least 8 characters.",
  mismatch: "Passwords do not match.",
  "password-failed": "Could not update your password. Please try again.",
};

const SAVED: Record<string, string> = {
  profile: "Profile updated.",
  password: "Password changed.",
};

export default async function SettingsPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const { userId, role } = await requireAdmin();
  const profile = await getProfile(userId);
  const assignments = await getActiveAssignments(userId);

  const initials = (profile?.full_name || profile?.email || "GG")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Account center" title="Settings" description="Manage your profile, security, and workspace preferences." />

      {searchParams.saved && (
        <p className="flex items-center gap-2 rounded-lg bg-status-submitted/10 px-3 py-2 text-sm font-medium text-status-submitted">
          <CheckCircle2 size={15} /> {SAVED[searchParams.saved] ?? "Saved."}
        </p>
      )}
      {searchParams.error && (
        <p className="rounded-lg bg-status-correction/10 px-3 py-2 text-sm font-medium text-status-correction">
          {ERRORS[searchParams.error] ?? "Something went wrong."}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block">
          <div className="surface-panel sticky top-24 flex flex-col gap-1 p-2">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/50 transition hover:bg-white/[0.045] hover:text-white">
                <s.icon size={16} /> {s.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="flex flex-col gap-6">
          {/* Profile */}
          <section id="profile" className="surface-panel scroll-mt-24 p-6">
            <SectionTitle icon={UserRound} title="Profile" description="Your identity across the platform." />
            <form action={updateOwnProfile} className="mt-5 flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-brand-100 to-brand-400 font-display text-xl font-bold text-surface-950">
                  {profile?.avatar_url ? (
                    <Image src={profile.avatar_url} alt="" width={64} height={64} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    initials
                  )}
                </span>
                <div className="flex-1">
                  <Input id="avatar_url" name="avatar_url" label="Avatar URL" defaultValue={profile?.avatar_url ?? ""} placeholder="https://..." />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="full_name" name="full_name" label="Full name" defaultValue={profile?.full_name ?? ""} placeholder="Your name" />
                <Input id="email" label="Email" defaultValue={profile?.email ?? ""} disabled className="opacity-60" />
              </div>
              <Button type="submit" className="w-fit">Save profile</Button>
            </form>
          </section>

          {/* Security */}
          <section id="security" className="surface-panel scroll-mt-24 p-6">
            <SectionTitle icon={KeyRound} title="Security" description="Change the password used to sign in." />
            <form action={changeOwnPassword} className="mt-5 grid max-w-md gap-4">
              <Input id="password" name="password" type="password" label="New password" autoComplete="new-password" minLength={8} required />
              <Input id="confirm" name="confirm" type="password" label="Confirm new password" autoComplete="new-password" minLength={8} required />
              <Button type="submit" className="w-fit">Update password</Button>
            </form>
          </section>

          {/* Organization & Access */}
          <section id="organization" className="surface-panel scroll-mt-24 p-6">
            <SectionTitle icon={Building2} title="Organization & Access" description="Where you have access, and with what role." />
            <div className="mt-5 flex flex-col gap-2">
              <div className="surface-recessed flex items-center gap-3 p-3.5">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-400/15 text-brand-400"><ShieldCheck size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">Platform administration</p>
                  <p className="text-xs text-white/35">Full administrative access</p>
                </div>
                <RoleBadge role={role} />
              </div>
              {assignments.filter((a) => a.role_key !== role).map((a) => (
                <div key={a.id} className="surface-recessed flex items-center gap-3 p-3.5">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/5 text-white/40"><Building2 size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">Additional assignment</p>
                    <p className="text-xs text-white/35">Active grant</p>
                  </div>
                  <RoleBadge role={a.role_key} />
                </div>
              ))}
            </div>
          </section>

          {/* Notifications */}
          <section id="notifications" className="surface-panel scroll-mt-24 p-6">
            <SectionTitle icon={Bell} title="Notifications" description="Choose what you want to hear about." />
            <div className="mt-5 flex flex-col gap-1">
              {[
                { label: "Lineup submissions", detail: "When a coach submits or corrects a lineup" },
                { label: "Match day reminders", detail: "24h and 1h before kickoff" },
                { label: "Access & security", detail: "New sign-ins, password changes, role grants" },
              ].map((n) => (
                <label key={n.label} className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 hover:bg-white/[0.02]">
                  <div>
                    <p className="text-sm font-medium text-white/80">{n.label}</p>
                    <p className="text-xs text-white/30">{n.detail}</p>
                  </div>
                  <input type="checkbox" defaultChecked disabled className="h-4 w-4 rounded accent-brand-400 opacity-50" />
                </label>
              ))}
            </div>
            <p className="mt-4 rounded-lg bg-white/[0.03] px-3 py-2 text-[11px] text-white/30">
              Preview only — notification delivery isn&apos;t wired up yet. This is what it will look like once it is.
            </p>
          </section>

          {/* Appearance & Language */}
          <section id="appearance" className="surface-panel scroll-mt-24 p-6">
            <SectionTitle icon={Moon} title="Appearance & Language" description="How the platform looks and reads for you." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-white/80">Theme</p>
                <div className="surface-recessed flex items-center gap-3 p-3.5">
                  <Moon size={16} className="text-brand-400" />
                  <span className="text-sm text-white/70">Dark — GGSP&apos;s design system</span>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-white/80">Language</p>
                <div className="surface-recessed flex items-center gap-3 p-3.5">
                  <Globe size={16} className="text-brand-400" />
                  <span className="text-sm text-white/70">English</span>
                </div>
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-white/[0.03] px-3 py-2 text-[11px] text-white/30">
              GGSP is dark-mode-only and English-only today. Additional themes and languages are a future addition, not silently faked here.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, description }: { icon: typeof UserRound; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-brand-400/15 bg-brand-400/[0.07] text-brand-400">
        <Icon size={18} />
      </span>
      <div>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="text-xs text-white/35">{description}</p>
      </div>
    </div>
  );
}
