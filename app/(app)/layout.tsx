import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getAppSession } from "@/lib/auth";
import { db } from "@/lib/db";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await getAppSession();
  if (!session?.user) {
    redirect("/login");
  }

  let workspaceName = "Workspace";
  try {
    const ws = await db.workspace.findUnique({
      where: { id: session.user.workspaceId },
      select: { name: true },
    });
    if (ws) workspaceName = ws.name;
  } catch {}

  return (
    <DashboardShell user={session.user} workspaceName={workspaceName}>
      {children}
    </DashboardShell>
  );
}
