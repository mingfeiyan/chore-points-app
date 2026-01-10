import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import PhotoGallery from "@/components/photos/PhotoGallery";
import GalleryPageHeader from "@/components/parent/GalleryPageHeader";

export default async function GalleryPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  const isParent = session.user.role === "PARENT";
  // Kids see their own photos only
  const kidId = !isParent ? session.user.id : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GalleryPageHeader />
        <PhotoGallery kidId={kidId} showKidFilter={isParent} showUpload={isParent} />
      </div>
    </div>
  );
}
