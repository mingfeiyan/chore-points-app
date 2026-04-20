import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import KidGalleryWrapper from "@/components/v2/kid/KidGalleryWrapper";

export default async function KidGalleryPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  if (session.user.role !== "KID") {
    redirect("/dashboard");
  }

  return <KidGalleryWrapper kidId={session.user.id} />;
}
