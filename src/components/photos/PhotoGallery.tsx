"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import PhotoUploadForm from "./PhotoUploadForm";
import OptimizedImage from "@/components/ui/OptimizedImage";

type Kid = {
  id: string;
  name: string | null;
  email: string;
};

type PhotoEntry = {
  id: string;
  photoUrl: string;
  points: number;
  note: string | null;
  date: string;
  chore: { title: string } | null;
  kid: Kid;
};

type PhotoGalleryProps = {
  kidId?: string; // If provided, only fetch this kid's photos (for kid view)
  showKidFilter?: boolean; // Whether to show the kid filter dropdown (default: true)
  showUpload?: boolean; // Whether to show the upload button (default: false)
};

export default function PhotoGallery({ kidId, showKidFilter = true, showUpload = false }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [viewingPhoto, setViewingPhoto] = useState<PhotoEntry | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const t = useTranslations("photos");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if ((showKidFilter || showUpload) && !kidId) {
      fetchKids();
    }
    fetchPhotos();
  }, [kidId, showKidFilter, showUpload]);

  const fetchKids = async () => {
    try {
      const response = await fetch("/api/family/kids");
      const data = await response.json();
      if (response.ok) {
        setKids(data.kids);
      }
    } catch (error) {
      console.error("Failed to fetch kids:", error);
    }
  };

  const fetchPhotos = async () => {
    try {
      const url = kidId ? `/api/photos?kidId=${kidId}` : "/api/photos";
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        setPhotos(data.photos);
      }
    } catch (error) {
      console.error("Failed to fetch photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPhotos = selectedKidId
    ? photos.filter((p) => p.kid.id === selectedKidId)
    : photos;

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    fetchPhotos();
  };

  const handleDownload = async (photo: PhotoEntry) => {
    try {
      const response = await fetch(photo.photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Create filename from kid name and local date (avoid UTC shifting an
      // evening photo's filename onto the next day).
      const kidName = photo.kid.name || "photo";
      const timeZone =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC";
      const date = new Date(photo.date).toLocaleDateString("en-CA", { timeZone });
      link.download = `${kidName}-${date}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download photo:", error);
    }
  };

  if (photos.length === 0) {
    return (
      <>
        <div className="bg-white rounded-[14px] border border-[rgba(68,55,32,0.14)] p-12 text-center">
          <div className="text-[#857d68] mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-[#2f2a1f] text-lg mb-2">{t("noPhotosYet")}</p>
          <p className="text-[#857d68] text-sm mb-4">{t("addPhotosWhenAwarding")}</p>
          {showUpload && kids.length > 0 && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4a6a32] text-white rounded-lg hover:bg-[#3d5a2a] transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("uploadPhoto")}
            </button>
          )}
        </div>

        {showUploadForm && (
          <PhotoUploadForm
            kids={kids}
            onSuccess={handleUploadSuccess}
            onClose={() => setShowUploadForm(false)}
          />
        )}
      </>
    );
  }

  return (
    <div>
      {/* Filter and upload controls */}
      {(showKidFilter || showUpload) && !kidId && (
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            {showKidFilter && kids.length > 0 && (
              <>
                <label className="text-sm font-medium text-[#2f2a1f]">
                  {t("filterByKid")}
                </label>
                <select
                  value={selectedKidId}
                  onChange={(e) => setSelectedKidId(e.target.value)}
                  className="px-4 py-2 border border-[rgba(68,55,32,0.14)] rounded-lg focus:outline-none focus:ring-[#6b8e4e] focus:border-[#6b8e4e]"
                >
                  <option value="">{t("allKids")}</option>
                  {kids.map((kid) => (
                    <option key={kid.id} value={kid.id}>
                      {kid.name || kid.email}
                    </option>
                  ))}
                </select>
              </>
            )}
            <span className="text-sm text-[#857d68]">
              {filteredPhotos.length} {t("photo")}
              {filteredPhotos.length !== 1 ? "s" : ""}
            </span>
          </div>
          {showUpload && kids.length > 0 && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4a6a32] text-white rounded-lg hover:bg-[#3d5a2a] transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("uploadPhoto")}
            </button>
          )}
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredPhotos.map((photo) => (
          <div
            key={photo.id}
            className="relative group cursor-pointer"
            onClick={() => setViewingPhoto(photo)}
          >
            <div className="aspect-square bg-[#F9F4E8] rounded-xl overflow-hidden">
              <OptimizedImage
                src={photo.photoUrl}
                alt={photo.chore?.title || t("pointAward")}
                variant="thumbnail"
                className="w-full h-full group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            {/* Points text - always visible at bottom */}
            {photo.points > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                <p className="text-[#9bbf7a] text-sm font-semibold">
                  +{photo.points} {tCommon("points")}
                </p>
              </div>
            )}
            {/* Overlay with info on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex flex-col justify-end p-3">
              <p className="text-white text-sm font-medium truncate">
                {photo.kid.name || photo.kid.email}
              </p>
              <p className="text-white/80 text-xs truncate">
                {photo.chore?.title || photo.note || t("pointAward")}
              </p>
              {photo.points > 0 && (
                <p className="text-[#9bbf7a] text-sm font-semibold">
                  +{photo.points} {tCommon("points")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Photo viewing modal */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-[14px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={viewingPhoto.photoUrl}
                alt={viewingPhoto.chore?.title || t("pointAward")}
                className="w-full max-h-[70vh] object-contain bg-gray-900"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => handleDownload(viewingPhoto)}
                  className="bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70"
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewingPhoto(null)}
                  className="bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70"
                  title="Close"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#2f2a1f]">
                    {viewingPhoto.kid.name || viewingPhoto.kid.email}
                  </p>
                  <p className="text-sm text-[#857d68]">
                    {viewingPhoto.chore?.title || viewingPhoto.note || t("pointAward")}
                  </p>
                </div>
                <div className="text-right">
                  {viewingPhoto.points > 0 && (
                    <p className="text-lg font-bold text-[#4a6a32]">
                      +{viewingPhoto.points} {tCommon("points")}
                    </p>
                  )}
                  <p className="text-sm text-[#857d68]">
                    {new Date(viewingPhoto.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {viewingPhoto.note && viewingPhoto.chore && (
                <p className="mt-2 text-sm text-gray-600 border-t pt-2">
                  {viewingPhoto.note}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload form modal */}
      {showUploadForm && (
        <PhotoUploadForm
          kids={kids}
          onSuccess={handleUploadSuccess}
          onClose={() => setShowUploadForm(false)}
        />
      )}
    </div>
  );
}
