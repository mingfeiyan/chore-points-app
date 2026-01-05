import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import FamilySetup from "@/components/family/FamilySetup";
import FamilyInviteCode from "@/components/family/FamilyInviteCode";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  // If user doesn't have a family, show family setup
  if (!session.user.familyId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FamilySetup user={session.user} />
      </div>
    );
  }

  // Fetch family data including invite code and members
  const family = await prisma.family.findUnique({
    where: { id: session.user.familyId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  // If user has a family, show appropriate dashboard based on role
  if (session.user.role === "PARENT") {
    const kids = family?.users.filter((u: { role: string }) => u.role === "KID") || [];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your family's chores, points, and rewards
          </p>

          {/* Family Info Card */}
          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {family?.name || "Your Family"}
                </h2>
                <p className="text-sm text-gray-500">
                  {kids.length === 0
                    ? "No kids have joined yet"
                    : `${kids.length} kid${kids.length > 1 ? "s" : ""}: ${kids
                        .map((k: { name: string | null; email: string }) => k.name || k.email)
                        .join(", ")}`}
                </p>
              </div>
              <FamilyInviteCode inviteCode={family?.inviteCode || ""} />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/chores"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">Chores</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage chores and point values
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/ledger"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">Points Ledger</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage kids' points and history
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/rewards"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                      />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">Rewards</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage rewards & approve redemptions
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Kid dashboard - redirect to points page
  redirect("/points");
}
