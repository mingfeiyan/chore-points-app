import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtRelative(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = Date.now() - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return "today";
  if (diffMs < 2 * day) return "yesterday";
  const days = Math.floor(diffMs / day);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/dashboard");

  const [families, recentSignups, lastActivity] = await Promise.all([
    prisma.family.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        inviteCode: true,
        photoProvider: true,
        googleDriveConnectedAt: true,
        users: { select: { id: true, role: true } },
        _count: {
          select: {
            photos: true,
            pointEntries: true,
            chores: true,
            rewards: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        family: { select: { name: true } },
      },
    }),
    prisma.pointEntry.groupBy({
      by: ["familyId"],
      _max: { createdAt: true },
    }),
  ]);

  const lastActivityByFamily = new Map(
    lastActivity.map((l) => [l.familyId, l._max.createdAt])
  );

  const totalParents = families.reduce(
    (sum, f) => sum + f.users.filter((u) => u.role === "PARENT").length,
    0
  );
  const totalKids = families.reduce(
    (sum, f) => sum + f.users.filter((u) => u.role === "KID").length,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {families.length} {families.length === 1 ? "family" : "families"} · {totalParents} parents · {totalKids} kids
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Families
          </h2>
          <div className="bg-white rounded border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <Th>Name</Th>
                  <Th>Invite</Th>
                  <Th>Storage</Th>
                  <Th align="right">Parents</Th>
                  <Th align="right">Kids</Th>
                  <Th align="right">Chores</Th>
                  <Th align="right">Entries</Th>
                  <Th align="right">Photos</Th>
                  <Th align="right">Rewards</Th>
                  <Th>Last activity</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {families.map((f) => {
                  const parents = f.users.filter((u) => u.role === "PARENT").length;
                  const kids = f.users.filter((u) => u.role === "KID").length;
                  const lastAt = lastActivityByFamily.get(f.id) ?? null;
                  return (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <Td>
                        <div className="font-medium text-gray-900">{f.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{f.id}</div>
                      </Td>
                      <Td mono>{f.inviteCode}</Td>
                      <Td>
                        <StorageBadge provider={f.photoProvider} />
                      </Td>
                      <Td align="right">{parents}</Td>
                      <Td align="right">{kids}</Td>
                      <Td align="right">{f._count.chores}</Td>
                      <Td align="right">{f._count.pointEntries}</Td>
                      <Td align="right">{f._count.photos}</Td>
                      <Td align="right">{f._count.rewards}</Td>
                      <Td>
                        <span title={lastAt ? new Date(lastAt).toISOString() : ""}>
                          {fmtRelative(lastAt)}
                        </span>
                      </Td>
                      <Td>{fmtDate(f.createdAt)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Recent signups
          </h2>
          <div className="bg-white rounded border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Family</Th>
                  <Th>Signed up</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentSignups.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <Td>{u.name || "—"}</Td>
                    <Td mono>{u.email}</Td>
                    <Td>{u.role}</Td>
                    <Td>{u.family?.name || "—"}</Td>
                    <Td>
                      <span title={new Date(u.createdAt).toISOString()}>
                        {fmtRelative(u.createdAt)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  mono = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2 ${align === "right" ? "text-right tabular-nums" : "text-left"} ${
        mono ? "font-mono text-xs" : ""
      } text-gray-700`}
    >
      {children}
    </td>
  );
}

function StorageBadge({ provider }: { provider: "NONE" | "VERCEL_BLOB" | "GOOGLE_DRIVE" }) {
  const map = {
    NONE: { label: "none", color: "bg-gray-100 text-gray-600" },
    VERCEL_BLOB: { label: "vercel blob", color: "bg-amber-100 text-amber-800" },
    GOOGLE_DRIVE: { label: "google drive", color: "bg-green-100 text-green-800" },
  };
  const { label, color } = map[provider];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
