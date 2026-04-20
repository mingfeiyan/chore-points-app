"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKidMode } from "@/components/providers/KidModeProvider";
import { useNewDesign } from "@/hooks/useNewDesign";
import PhotoGallery from "@/components/photos/PhotoGallery";
import GalleryPageHeader from "@/components/parent/GalleryPageHeader";
import KidGallery from "@/components/v2/kid/KidGallery";

export default function ViewAsGalleryClient() {
  const { viewingAsKid, isKidMode } = useKidMode();
  const { isNewDesign } = useNewDesign();
  const router = useRouter();

  useEffect(() => {
    if (!isKidMode) {
      router.push("/dashboard");
    }
  }, [isKidMode, router]);

  if (!viewingAsKid) {
    return null;
  }

  if (isNewDesign) {
    return <KidGallery kidId={viewingAsKid.id} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GalleryPageHeader />
        <PhotoGallery kidId={viewingAsKid.id} showKidFilter={false} />
      </div>
    </div>
  );
}
