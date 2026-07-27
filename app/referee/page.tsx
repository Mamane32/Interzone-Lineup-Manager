import { requireRole, getProfile } from "@/lib/access";
import ComingSoonWorkspace from "@/components/auth/ComingSoonWorkspace";

export const dynamic = "force-dynamic";

export default async function RefereePage() {
  const { userId } = await requireRole(["referee", "admin", "super_admin"]);
  const profile = await getProfile(userId);
  return <ComingSoonWorkspace roleLabel="Referee" profile={profile} />;
}
