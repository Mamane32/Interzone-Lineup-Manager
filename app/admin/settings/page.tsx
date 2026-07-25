import Card from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="text-ink-muted">Interzone Lineup Manager runs a single-administrator model.</p>
      </div>

      <Card className="max-w-xl">
        <h2 className="mb-3 font-display text-lg font-semibold">Administrator access</h2>
        <p className="text-sm text-ink-muted">
          There is one administrator account, managed in Supabase Auth. Sign-in uses email and
          password — see the <code className="text-amber-signal">Authentication → Users</code> section of your
          Supabase project dashboard to change the password or update the email.
        </p>
      </Card>

      <Card className="max-w-xl">
        <h2 className="mb-3 font-display text-lg font-semibold">Coach links</h2>
        <p className="text-sm text-ink-muted">
          Every team gets a permanent private link at{" "}
          <code className="text-amber-signal">/team/&lt;token&gt;</code>. Coaches never create an account or log in —
          the link is their identity. Links are managed from the Teams page.
        </p>
      </Card>
    </div>
  );
}
