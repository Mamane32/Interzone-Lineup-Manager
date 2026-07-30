import AuthFrame from "@/components/auth/AuthFrame";
import LoginForm from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default function UnifiedLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Sign in to your workspace"
      description="Use your organization credentials to access the tools and operations assigned to you."
    >
      <LoginForm errorCode={searchParams.error} />
    </AuthFrame>
  );
}
