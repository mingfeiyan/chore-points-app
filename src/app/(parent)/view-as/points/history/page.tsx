import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import ViewAsHistoryClient from "./ViewAsHistoryClient";

export default async function ViewAsHistoryPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "PARENT") {
    redirect("/dashboard");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  return <ViewAsHistoryClient />;
}
