import { requireRole, getProfile } from "@/lib/access";
import ComingSoonWorkspace from "@/components/auth/ComingSoonWorkspace";

export const dynamic = "force-dynamic";

export default async function ViewerPage() {
  const { userId } = await requireRole(["viewer", "admin", "super_admin"]);
  const profile = await getProfile(userId);
  return <ComingSoonWorkspace roleLabel="Viewer" profile={profile} />;
}
