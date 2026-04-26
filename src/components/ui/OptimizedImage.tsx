"use client";

import Image from "next/image";
import { useState } from "react";

type OptimizedImageProps = {
  src: string;
  alt: string;
  variant: "thumbnail" | "full" | "carousel" | "small";
  className?: string;
  priority?: boolean;
  onClick?: () => void;
};

const SIZES = {
  thumbnail: {
    width: 300,
    height: 300,
    sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw",
    quality: 60,
  },
  small: {
    width: 100,
    height: 100,
    sizes: "100px",
    quality: 60,
  },
  carousel: {
    width: 800,
    height: 450,
    sizes: "(max-width: 768px) 100vw, 50vw",
    quality: 75,
  },
  full: {
    width: 1200,
    height: 800,
    sizes: "100vw",
    quality: 85,
  },
};

export default function OptimizedImage({
  src,
  alt,
  variant,
  className = "",
  priority = false,
  onClick,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const config = SIZES[variant];

  // Drive proxy URLs: ask the server for a size-matched thumbnail. Cuts
  // gallery bandwidth ~50× compared to streaming the full 5MB original
  // for every tile. Vercel Blob URLs are unaffected — next/image's
  // remotePatterns config handles their optimization already.
  // We request 2× the displayed CSS width so retina screens render crisp;
  // next/image does the same for blob URLs via its srcset, but the Drive
  // proxy is a single redirect so we encode the device-pixel intent here.
  // The proxy clamps to its MAX_THUMB (1600) on its end.
  const isDriveProxy = src.startsWith("/api/drive/");
  const resolvedSrc = isDriveProxy
    ? `${src}${src.includes("?") ? "&" : "?"}thumb=${config.width * 2}`
    : src;

  if (error) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={onClick}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      <Image
        src={resolvedSrc}
        alt={alt}
        width={config.width}
        height={config.height}
        sizes={config.sizes}
        priority={priority}
        quality={config.quality}
        unoptimized={isDriveProxy}
        className={`object-cover transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => setError(true)}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
