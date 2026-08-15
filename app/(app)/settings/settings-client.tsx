"use client";

import { useState } from "react";
import { SectionCard } from "@/components/section-card";
import { InviteMemberSchema } from "@/lib/validation";
import { WarningCircle, CheckCircle, SpinnerGap } from "@phosphor-icons/react";

type Role = "ADMIN" | "ANALYST" | "VIEWER";

const ROLE_META: Record<Role, { label: string; cls: string; desc: string }> = {
  ADMIN: { label: "Admin", cls: "bg-rose-500/15 text-[var(--error)] ring-rose-500/30", desc: "Full access — members, billing, settings." },
  ANALYST: { label: "Analyst", cls: "bg-[var(--primary)]/15 text-[var(--primary)] ring-[var(--primary)]/30", desc: "Ingest, triage, classify, generate reports." },
  VIEWER: { label: "Viewer", cls: "bg-[var(--surface-high)] text-[var(--on-surface-variant)] ring-1 ring-[var(--outline)]", desc: "Read-only. View dashboards, inbox, reports, Ask LOOP." },
};

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

type WorkspaceLite = {
  id: string;
  name: string;
  createdAt: string;
  userCount: number;
};

export function SettingsClient({
  currentUserId,
  canManage,
  workspace,
  members,
}: {
  currentUserId: string;
  canManage: boolean;
  workspace: WorkspaceLite | null;
  members: Member[];
}) {
  const [list, setList] = useState<Member[]>(members);
  const [form, setForm] = useState<{ name: string; email: string; password: string; role: Role }>({
    name: "",
    email: "",
    password: "",
    role: "VIEWER",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setErrors({});
    setInviteError(null);
    setInviteMsg(null);

    // Client-side Zod validation
    const validation = InviteMemberSchema.safeParse(form);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const fieldName = String(issue.path[0]);
        if (!fieldErrors[fieldName]) fieldErrors[fieldName] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    // Client-side pre-check: verify if email already belongs to a member in this workspace
    const alreadyMember = list.find(
      (m) => m.email.toLowerCase() === validation.data.email.toLowerCase(),
    );
    if (alreadyMember) {
      setErrors({
        email: `"${alreadyMember.name}" (${alreadyMember.email}) is already a member with the ${ROLE_META[alreadyMember.role].label} role.`,
      });
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.isExistingUser || res.status === 409) {
          setErrors({ email: d.error ?? "User with this email already exists" });
        }
        throw new Error(d.error ?? "Failed to invite member");
      }
      const created: Member = {
        id: d.id,
        name: d.name,
        email: d.email,
        role: d.role,
        createdAt: new Date().toISOString(),
      };
      setList((cur) => [...cur, created]);
      setForm({ name: "", email: "", password: "", role: "VIEWER" });
      setInviteMsg(`Invited ${created.name} (${ROLE_META[created.role].label}). Temporary password has been set — share with them securely.`);
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(userId: string, newRole: Role) {
    if (!canManage) return;
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/members?userId=${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setList((cur) => cur.map((m) => (m.id === userId ? { ...m, role: d.role ?? newRole } : m)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeMember(m: Member) {
    if (!canManage) return;
    if (!confirm(`Remove ${m.name} (${m.email}) from workspace? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/members?userId=${encodeURIComponent(m.id)}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setList((cur) => cur.filter((x) => x.id !== m.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to remove member");
    }
  }

  const admins = list.filter((m) => m.role === "ADMIN").length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <SectionCard
          title="Workspace"
          description="The isolation boundary for your company. Everything — users, feedback, themes, reports — lives inside one workspace."
        >
          {workspace ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">Name</dt>
                <dd className="mt-1 text-lg font-semibold text-[var(--on-background)]">{workspace.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">Members</dt>
                <dd className="mt-1 text-lg font-semibold text-[var(--on-background)] font-mono">{workspace.userCount}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">Created</dt>
                <dd className="mt-1 text-[var(--on-background)] text-xs font-mono" suppressHydrationWarning>{new Date(workspace.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-[var(--on-surface-variant)]">Workspace info not available.</p>
          )}
        </SectionCard>

        <SectionCard
          title={`Members · ${list.length} total · ${admins} admin${admins === 1 ? "" : "s"}`}
          description={canManage ? "Invite teammates and assign roles. The API enforces every permission, not just the UI." : "Read-only. Ask an Admin to make changes."}
        >
          <div className="overflow-hidden rounded-xl border border-[var(--outline)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-low)] text-left text-[11px] uppercase tracking-wider text-[var(--on-surface-variant)]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--outline-variant)]">
                {list.map((m) => {
                  const meta = ROLE_META[m.role];
                  const isSelf = m.id === currentUserId;
                  return (
                    <tr key={m.id} className="hover:bg-[var(--surface-low)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--on-background)] flex items-center gap-2">
                          <span>{m.name}</span>
                          {isSelf && <span className="text-[10px] text-[var(--primary)] font-mono font-semibold">(you)</span>}
                        </div>
                        <div className="text-xs text-[var(--on-surface-variant)]">{m.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {canManage && !isSelf ? (
                          <select
                            value={m.role}
                            disabled={updatingId === m.id}
                            onChange={(e) => changeRole(m.id, e.target.value as Role)}
                            className="rounded-lg border border-[var(--outline)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--on-background)]"
                          >
                            {(Object.keys(ROLE_META) as Role[]).map((r) => (
                              <option key={r} value={r}>{ROLE_META[r].label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${meta.cls}`}>
                            {meta.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--on-surface-variant)] font-mono" suppressHydrationWarning>
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeMember(m)}
                            disabled={isSelf && admins === 1}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--error)] hover:bg-[var(--error)]/10 disabled:cursor-not-allowed disabled:opacity-40"
                            title={isSelf && admins === 1 ? "Cannot remove the last Admin." : undefined}
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="space-y-6">
        <SectionCard title="Roles explained" description="Role hierarchy: Viewer < Analyst < Admin.">
          <ul className="space-y-3 text-sm">
            {(Object.keys(ROLE_META) as Role[]).map((r) => (
              <li key={r} className="rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${ROLE_META[r].cls}`}>
                    {ROLE_META[r].label}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[var(--on-surface-variant)] leading-relaxed">{ROLE_META[r].desc}</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        {canManage && (
          <SectionCard
            title="Invite teammate"
            description="Set a strong temporary password and share it with them securely (1Password, Slack, etc.)."
          >
            <form onSubmit={invite} className="space-y-3" noValidate>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined as unknown as string }));
                  }}
                  placeholder="Priya Analyst"
                  className={`w-full rounded-xl border bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)] focus:outline-none ${
                    errors.name ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/30" : "border-[var(--outline)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-[var(--error)] flex items-center gap-1">
                    <WarningCircle size={13} weight="fill" /> {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, email: e.target.value }));
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined as unknown as string }));
                  }}
                  placeholder="priya@company.com"
                  className={`w-full rounded-xl border bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)] focus:outline-none ${
                    errors.email ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/30" : "border-[var(--outline)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-[var(--error)] flex items-center gap-1">
                    <WarningCircle size={13} weight="fill" /> {errors.email}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">
                  Temporary password (min 8 chars) *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, password: e.target.value }));
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined as unknown as string }));
                  }}
                  placeholder="Share securely"
                  className={`w-full rounded-xl border bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)] focus:outline-none ${
                    errors.password ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/30" : "border-[var(--outline)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  }`}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-[var(--error)] flex items-center gap-1">
                    <WarningCircle size={13} weight="fill" /> {errors.password}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                  className="w-full rounded-xl border border-[var(--outline)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--on-background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                >
                  {(Object.keys(ROLE_META) as Role[]).map((r) => (
                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                  ))}
                </select>
              </div>
              {inviteError && (
                <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-2.5 text-sm text-[var(--error)] flex items-center gap-2">
                  <WarningCircle size={16} weight="fill" className="shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}
              {inviteMsg && (
                <div className="rounded-xl border border-[var(--secondary)]/20 bg-[var(--secondary)]/10 px-4 py-2.5 text-sm text-[var(--on-background)] flex items-center gap-2">
                  <CheckCircle size={16} weight="fill" className="text-[var(--secondary)] shrink-0" />
                  <span>{inviteMsg}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={inviting}
                className="w-full rounded-xl btn-primary px-4 py-2.5 text-sm font-semibold text-[var(--on-background)] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {inviting ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin" />
                    <span>Inviting…</span>
                  </>
                ) : (
                  "+ Invite to workspace"
                )}
              </button>
            </form>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
