"use client";

type BadgeIconProps = {
  imageUrl?: string | null;
  emoji?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  alt?: string;
  className?: string;
};

const sizeClasses = {
  sm: "w-6 h-6 text-lg",
  md: "w-8 h-8 text-2xl",
  lg: "w-12 h-12 text-3xl",
  xl: "w-14 h-14 text-4xl",
  "2xl": "w-20 h-20 text-6xl",
};

const imageSizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-14 h-14",
  "2xl": "w-20 h-20",
};

export default function BadgeIcon({
  imageUrl,
  emoji,
  size = "md",
  alt = "Badge",
  className = "",
}: BadgeIconProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={`${imageSizeClasses[size]} object-cover rounded-full ${className}`}
      />
    );
  }

  return (
    <span className={`${sizeClasses[size]} ${className}`}>
      {emoji || "🏅"}
    </span>
  );
}
