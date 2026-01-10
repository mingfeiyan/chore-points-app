"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

type PhotoEntry = {
  id: string;
  photoUrl: string;
  points: number;
  note: string | null;
  date: string;
  chore: { title: string } | null;
  kid: {
    id: string;
    name: string | null;
    email: string;
  };
};

export default function PhotoCarousel() {
  const t = useTranslations("photos");
  const tCommon = useTranslations("common");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const response = await fetch("/api/photos");
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

  const nextPhoto = useCallback(() => {
    if (photos.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }
  }, [photos.length]);

  const prevPhoto = useCallback(() => {
    if (photos.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  }, [photos.length]);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (photos.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      nextPhoto();
    }, 5000);

    return () => clearInterval(interval);
  }, [photos.length, isPaused, nextPhoto]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="aspect-video bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">{t("pageTitle")}</h2>
          <Link
            href="/gallery"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {t("pageTitle")}
          </Link>
        </div>
        <div className="aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-300 mb-2"
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
          <p className="text-sm text-gray-400">{t("noPhotosYet")}</p>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">{t("pageTitle")}</h2>
        <Link
          href="/gallery"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          View All ({photos.length})
        </Link>
      </div>

      <div
        className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Photo */}
        <img
          src={currentPhoto.photoUrl}
          alt={currentPhoto.chore?.title || currentPhoto.note || t("pointAward")}
          className="w-full h-full object-contain"
        />

        {/* Overlay with info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="font-medium text-sm">
                {currentPhoto.kid.name || currentPhoto.kid.email}
              </p>
              <p className="text-xs text-white/80 truncate max-w-[200px]">
                {currentPhoto.chore?.title || currentPhoto.note || t("pointAward")}
              </p>
            </div>
            {currentPhoto.points > 0 && (
              <span className="text-green-400 font-semibold text-sm">
                +{currentPhoto.points} {tCommon("pts")}
              </span>
            )}
          </div>
        </div>

        {/* Navigation arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center transition opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
              style={{ opacity: isPaused ? 1 : 0.5 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center transition opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
              style={{ opacity: isPaused ? 1 : 0.5 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Dots indicator */}
        {photos.length > 1 && (
          <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1.5">
            {photos.slice(0, Math.min(photos.length, 10)).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition ${
                  idx === currentIndex ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
            {photos.length > 10 && (
              <span className="text-white/60 text-xs ml-1">+{photos.length - 10}</span>
            )}
          </div>
        )}
      </div>

      {/* Date */}
      <p className="text-xs text-gray-400 mt-2 text-right">
        {new Date(currentPhoto.date).toLocaleDateString()}
      </p>
    </div>
  );
}
