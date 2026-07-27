import Link from "next/link";
import { login } from "./actions";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-amber-signal">
            Interzone
          </p>
          <h1 className="font-display text-2xl font-semibold text-white">
            Lineup Manager
          </h1>
        </div>

        <form action={login} className="flex flex-col gap-4">
          <Input
            id="email"
            name="email"
            type="email"
            label="Administrator email"
            placeholder="admin@interzone.ht"
            autoFocus
            required
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            required
          />
          {searchParams.error && (
            <p className="text-sm text-status-correction">
              Incorrect email or password. Try again.
            </p>
          )}
          <Button type="submit" size="lg" className="mt-2 w-full">
            Sign in
          </Button>
          <Link href="/login/forgot-password" className="text-center text-sm text-ink-muted hover:text-white">
            Forgot your password?
          </Link>
        </form>
      </Card>
    </main>
  );
}
