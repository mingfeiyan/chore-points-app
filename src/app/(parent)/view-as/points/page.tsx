import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import ViewAsPointsClient from "./ViewAsPointsClient";

export default async function ViewAsPointsPage() {
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

  return <ViewAsPointsClient />;
}
