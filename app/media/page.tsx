import { requireRole, getProfile } from "@/lib/access";
import ComingSoonWorkspace from "@/components/auth/ComingSoonWorkspace";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const { userId } = await requireRole(["media", "admin", "super_admin"]);
  const profile = await getProfile(userId);
  return <ComingSoonWorkspace roleLabel="Media" profile={profile} />;
}
