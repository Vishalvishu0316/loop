import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getAppSession, requireWorkspaceSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageMembers } from "@/lib/permissions";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getAppSession();
  if (!session?.user) redirect("/login");
  await requireWorkspaceSession();
  const { workspaceId, user } = session;

  const [workspace, members] = await Promise.all([
    db.workspace.findUnique({
      where: { id: workspaceId },
      include: { _count: { select: { users: true } } },
    }),
    db.user.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: [
        { role: "asc" },
        { createdAt: "asc" },
      ],
    }),
  ]);

  return (
    <>
      <PageHeader
        breadcrumb="Workspace"
        title="Settings"
        description="Manage your workspace, invite teammates, and assign roles. Role-based access is enforced server-side — hiding a button in the UI is never the only check."
      />
      <SettingsClient
        currentUserId={user.id}
        canManage={canManageMembers(user)}
        workspace={workspace ? {
          id: workspace.id,
          name: workspace.name,
          createdAt: workspace.createdAt.toISOString(),
          userCount: workspace._count.users,
        } : null}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        members={members.map((m: any) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
