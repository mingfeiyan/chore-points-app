import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import ParentRewards from "@/components/v2/parent/ParentRewards";

export default async function RewardsPage() {
  const session = await getSession();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "PARENT") redirect("/dashboard");
  if (!session.user.familyId) redirect("/dashboard");

  return <ParentRewards />;
}
