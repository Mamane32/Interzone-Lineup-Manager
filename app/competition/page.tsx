import { requireRole, getProfile } from "@/lib/access";
import ComingSoonWorkspace from "@/components/auth/ComingSoonWorkspace";

export const dynamic = "force-dynamic";

export default async function CompetitionManagerPage() {
  const { userId } = await requireRole(["competition_manager", "admin", "super_admin"]);
  const profile = await getProfile(userId);
  return <ComingSoonWorkspace roleLabel="Competition Manager" profile={profile} />;
}
