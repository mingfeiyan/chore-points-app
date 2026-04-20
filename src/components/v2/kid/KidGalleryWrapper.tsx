"use client";

import { useNewDesign } from "@/hooks/useNewDesign";
import KidGallery from "./KidGallery";
import PhotoGallery from "@/components/photos/PhotoGallery";

interface KidGalleryWrapperProps {
  kidId: string;
}

export default function KidGalleryWrapper({ kidId }: KidGalleryWrapperProps) {
  const { isNewDesign } = useNewDesign();

  if (!isNewDesign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">My Photos</h1>
          <PhotoGallery kidId={kidId} showKidFilter={false} showUpload={false} />
        </div>
      </div>
    );
  }

  return <KidGallery />;
}
