import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import PhotoGallery from "@/components/photos/PhotoGallery";
import ParentTabBar from "@/components/v2/ParentTabBar";

export default async function GalleryPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  const isParent = session.user.role === "PARENT";
  const kidId = !isParent ? session.user.id : undefined;

  return (
    <div className="min-h-screen bg-pg-cream pb-[110px] font-[family-name:var(--font-inter)]">
      <div className="px-7 pt-7">
        <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
          Photos
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-ink">
          Photo <em className="text-pg-accent-deep">gallery</em>
        </h1>
      </div>
      <div className="px-7 mt-5">
        <PhotoGallery kidId={kidId} showKidFilter={isParent} showUpload={isParent} />
      </div>
      <ParentTabBar />
    </div>
  );
}
