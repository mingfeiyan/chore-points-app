import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import ViewAsRedeemClient from "./ViewAsRedeemClient";

export default async function ViewAsRedeemPage() {
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

  return <ViewAsRedeemClient />;
}
