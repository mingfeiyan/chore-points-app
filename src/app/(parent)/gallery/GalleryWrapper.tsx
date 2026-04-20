"use client";

import { ReactNode } from "react";
import { useNewDesign } from "@/hooks/useNewDesign";
import PhotoGallery from "@/components/photos/PhotoGallery";
import ParentTabBar from "@/components/v2/ParentTabBar";

type Props = {
  fallback: ReactNode;
  kidId?: string;
  isParent: boolean;
};

export default function GalleryWrapper({ fallback, kidId, isParent }: Props) {
  const { isNewDesign } = useNewDesign();

  if (!isNewDesign) return <>{fallback}</>;

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
