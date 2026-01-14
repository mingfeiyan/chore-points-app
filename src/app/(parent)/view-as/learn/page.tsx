import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import ViewAsLearnClient from "./ViewAsLearnClient";

export default async function ViewAsLearnPage() {
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

  return <ViewAsLearnClient />;
}
