"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import KidHeaderBG from "@/components/v2/KidHeaderBG";
import KidTabBar from "@/components/v2/KidTabBar";

type PhotoEntry = {
  id: string;
  photoUrl: string;
  points: number;
  note: string | null;
  date: string;
  chore: { title: string } | null;
};

export default function KidGallery() {
  const { data: session } = useSession();
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchPhotos();
  }, [session?.user?.id]);

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`/api/photos?kidId=${session?.user?.id}`);
      const data = await res.json();
      if (res.ok) {
        setPhotos(data.photos || []);
      }
    } catch (err) {
      console.error("Failed to fetch photos:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ca-cream flex items-center justify-center">
        <div className="text-ca-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ca-cream pb-20 font-[family-name:var(--font-nunito)]">
      <KidHeaderBG compact>
        <div className="text-center">
          <h1 className="text-2xl font-black font-[family-name:var(--font-baloo-2)]">Gallery</h1>
        </div>
      </KidHeaderBG>

      <div className="px-4 mt-4">
        {photos.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl mb-3 block">{"\uD83D\uDDBC\uFE0F"}</span>
            <p className="text-ca-muted font-medium">No photos yet</p>
            <p className="text-ca-muted text-sm mt-1">
              Complete chores with photos to see them here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative rounded-xl overflow-hidden aspect-square shadow-sm"
              >
                <img
                  src={photo.photoUrl}
                  alt={photo.chore?.title || "Photo"}
                  className="w-full h-full object-cover"
                />
                {photo.points > 0 && (
                  <div className="absolute bottom-2 right-2 bg-ca-gold text-white text-xs font-extrabold rounded-full px-2 py-0.5">
                    +{photo.points}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <KidTabBar />
    </div>
  );
}
