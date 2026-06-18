"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";

type StaffMember = {
  id: number;
  userId: number;
  role: string;
  status: string;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string | null;
  };
  team: {
    id: number;
    name: string;
  };
};

type Team = {
  id: number;
  name: string;
  league: string | null;
};

type TeamMembership = {
  id: number;
  role: string;
  status: string;
  createdAt: string;
  team: {
    id: number;
    name: string;
  };
};

type StaffUser = {
  id: number;
  name: string | null;
  email: string;
  role: string | null;
  teamMemberships?: TeamMembership[];
};

type PendingInvitation = {
  id: number;
  status: string;
};

export default function AdminStaffPage() {
  const { t } = useTranslation();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Analyst");
  const [inviteTeamId, setInviteTeamId] = useState<number | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);

  const roles = [
    "Head Coach",
    "Assistant Coach",
    "Head Analyst",
    "Analyst",
    "Scout",
    "Physio",
    "Other",
  ];

  useEffect(() => {
    fetchTeams();
    fetchStaff();
    if (selectedTeam || inviteTeamId) {
      fetchPendingInvitations(selectedTeam || inviteTeamId);
    }
  }, [selectedTeam, inviteTeamId]);

  async function fetchTeams() {
    try {
      const res = await fetch("/api/teams");
      const data = (await res.json()) as { ok?: boolean; teams?: Team[] };
      if (data.ok && data.teams) {
        setTeams(data.teams);
        if (data.teams.length > 0 && !inviteTeamId) {
          setInviteTeamId(data.teams[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch teams:", err);
    }
  }

  async function fetchStaff() {
    setLoading(true);
    try {
      const url = selectedTeam
        ? `/api/admin/teams/${selectedTeam}/staff`
        : "/api/admin/staff";
      const res = await fetch(url);
      const data = (await res.json()) as { ok?: boolean; staff?: StaffMember[] | StaffUser[] };
      if (data.ok) {
        if (selectedTeam && data.staff) {
          setStaff(data.staff as StaffMember[]);
        } else if (data.staff) {
          // Flatten staff from all teams
          const allStaff: StaffMember[] = [];
          (data.staff as StaffUser[]).forEach((user) => {
            if (user.teamMemberships) {
              user.teamMemberships.forEach((membership) => {
                allStaff.push({
                  id: membership.id,
                  userId: user.id,
                  role: membership.role || user.role,
                  status: membership.status,
                  createdAt: membership.createdAt,
                  user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                  },
                  team: membership.team,
                });
              });
            }
          });
          setStaff(allStaff);
        }
      }
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      setError(t("failedToLoadStaff"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchPendingInvitations(teamId: number | null) {
    if (!teamId) return;
    try {
      const res = await fetch(`/api/invitations?teamId=${teamId}`);
      const data = (await res.json()) as { ok?: boolean; invitations?: PendingInvitation[] };
      if (data.ok && data.invitations) {
        setPendingInvitations(data.invitations.filter((invitation) => invitation.status === "pending"));
      }
    } catch (err) {
      console.error("Failed to fetch invitations:", err);
    }
  }

  async function handleInvite() {
    if (!inviteEmail || !inviteTeamId || !inviteRole) {
      setError(t("pleaseFillAllFields"));
      return;
    }

    try {
      // Use new invitation endpoint
      const res = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          teamId: inviteTeamId,
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setMessage(`${t("invitationSentTo")} ${inviteEmail}! ${t("theyWillReceiveEmail")}`);
        setInviteEmail("");
        setShowInviteModal(false);
        fetchPendingInvitations(inviteTeamId);
      } else {
        setError(data.message || t("failedToSendInvitation"));
      }
    } catch (err) {
      setError(t("networkError"));
    }
  }

  async function handleRemove(membershipId: number) {
    if (!confirm(t("confirmRemoveStaffMember"))) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/staff/${membershipId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.ok) {
        setMessage(t("staffMemberRemovedSuccessfully"));
        fetchStaff();
      } else {
        setError(data.message || t("failedToRemoveStaffMember"));
      }
    } catch (err) {
      setError(t("networkError"));
    }
  }

  async function handleUpdateRole(membershipId: number, newRole: string, teamId: number) {
    try {
      const res = await fetch(`/api/admin/staff/${membershipId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: newRole,
          teamId: teamId,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setMessage(t("roleUpdatedSuccessfully"));
        fetchStaff();
      } else {
        setError(data.message || t("failedToUpdateRole"));
      }
    } catch (err) {
      setError(t("networkError"));
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">{t("staffManagement")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("manageTeamMembersAndRoles")}</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
+ {t("inviteStaff")}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/20 border border-red-500/50 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-md bg-emerald-500/20 border border-emerald-500/50 p-3 text-sm text-emerald-400">
          {message}
        </div>
      )}

      {/* Team Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-slate-300">{t("filterByTeam")}:</label>
        <select
          value={selectedTeam || ""}
          onChange={(e) => setSelectedTeam(e.target.value ? parseInt(e.target.value) : null)}
          className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
        >
          <option value="">{t("allTeams")}</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Staff Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">{t("loading")}</div>
      ) : staff.length === 0 ? (
        <div className="text-center py-12 text-slate-400">{t("noStaffMembersFound")}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/50">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">{t("name")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">{t("email")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">{t("team")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">{t("role")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">{t("status")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-900/30">
                  <td className="px-4 py-3 text-sm text-slate-200">{member.user.name || "N/A"}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{member.user.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{member.team.name}</td>
                  <td className="px-4 py-3">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value, member.team.id)}
                      className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-500"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        member.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
{t("remove")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950 p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-50">{t("inviteStaffMember")}</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">{t("email")}</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="staff@club.com"
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                />
                <p className="mt-1 text-xs text-slate-500">
{t("userMustHaveAccount")}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">{t("team")}</label>
                <select
                  value={inviteTeamId || ""}
                  onChange={(e) => setInviteTeamId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">{t("role")}</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleInvite}
                className="flex-1 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
{t("invite")}
              </button>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setError(null);
                }}
                className="flex-1 rounded-md border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
{t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
