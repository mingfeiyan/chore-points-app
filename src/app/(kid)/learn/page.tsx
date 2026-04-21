import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import KidLearnEntry from "@/components/v2/kid/KidLearnEntry";

export default async function LearnPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  if (session.user.role === "PARENT") {
    redirect("/dashboard");
  }

  return <KidLearnEntry />;
}
