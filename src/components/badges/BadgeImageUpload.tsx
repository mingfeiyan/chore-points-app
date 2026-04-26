"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

type BadgeImageUploadProps = {
  imageUrl: string;
  onImageChange: (url: string) => void;
  label?: string;
};

export default function BadgeImageUpload({
  imageUrl,
  onImageChange,
  label = "Badge Image",
}: BadgeImageUploadProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const tCommon = useTranslations("common");

  // Image cropping state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please use JPG, PNG, GIF, or WebP.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setShowCropper(true);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    // Initialize crop centered with 80% of the smaller dimension so the
    // square always fits inside the image regardless of orientation.
    const initial = centerCrop(
      makeAspectCrop({ unit: "%", width: 80 }, 1, naturalWidth, naturalHeight),
      naturalWidth,
      naturalHeight
    );
    setCrop(initial);
    // Seed completedCrop in display pixels so Apply Crop works even if the
    // user never drags. Without this, ReactCrop only emits onComplete after
    // a manual interaction and we'd produce a zero-area canvas.
    setCompletedCrop({
      unit: "px",
      x: (initial.x / 100) * width,
      y: (initial.y / 100) * height,
      width: (initial.width / 100) * width,
      height: (initial.height / 100) * height,
    });
  };

  // Resolve a pixel-unit crop from the live image element + current crop
  // state. Avoids the timing gap between onImageLoad and ReactCrop's first
  // onComplete (which only fires after a manual drag), and also handles the
  // case where the image element resized after the initial seed.
  const resolvePixelCrop = (): PixelCrop | null => {
    const image = imgRef.current;
    if (!image) return null;

    const displayedWidth = image.width;
    const displayedHeight = image.height;
    if (!displayedWidth || !displayedHeight) return null;

    if (
      completedCrop &&
      completedCrop.width > 0 &&
      completedCrop.height > 0 &&
      completedCrop.x >= 0 &&
      completedCrop.y >= 0 &&
      completedCrop.x + completedCrop.width <= displayedWidth + 1 &&
      completedCrop.y + completedCrop.height <= displayedHeight + 1
    ) {
      return completedCrop;
    }

    if (!crop || !crop.width || !crop.height) return null;
    const isPercent = crop.unit === "%";
    return {
      unit: "px",
      x: isPercent ? (crop.x / 100) * displayedWidth : crop.x,
      y: isPercent ? (crop.y / 100) * displayedHeight : crop.y,
      width: isPercent ? (crop.width / 100) * displayedWidth : crop.width,
      height: isPercent ? (crop.height / 100) * displayedHeight : crop.height,
    };
  };

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    const image = imgRef.current;
    if (!image) return null;

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    const displayedWidth = image.width;
    const displayedHeight = image.height;
    if (!naturalWidth || !naturalHeight || !displayedWidth || !displayedHeight) {
      return null;
    }

    const pxCrop = resolvePixelCrop();
    if (!pxCrop || pxCrop.width <= 0 || pxCrop.height <= 0) return null;

    const scaleX = naturalWidth / displayedWidth;
    const scaleY = naturalHeight / displayedHeight;

    const sx = pxCrop.x * scaleX;
    const sy = pxCrop.y * scaleY;
    const sw = pxCrop.width * scaleX;
    const sh = pxCrop.height * scaleY;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          // Sanity check — toBlob can return ~empty blobs for tainted /
          // misconfigured canvases, which would upload as broken images.
          if (!blob || blob.size < 200) {
            resolve(null);
          } else {
            resolve(blob);
          }
        },
        "image/jpeg",
        0.92
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCrop, crop]);

  const handleCropComplete = async () => {
    if (!completedCrop) {
      setError("Please select a crop area");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const croppedBlob = await getCroppedImg();
      if (!croppedBlob) {
        setError("Failed to crop image");
        setLoading(false);
        return;
      }

      // Upload the cropped image
      const formData = new FormData();
      formData.append("file", croppedBlob, "badge-image.jpg");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        setError(uploadData.error || "Failed to upload image");
        setLoading(false);
        return;
      }

      onImageChange(uploadData.url);
      setShowCropper(false);
      setImageSrc(null);
      setLoading(false);
    } catch (err) {
      console.error("Error uploading cropped image:", err);
      setError("Failed to upload image");
      setLoading(false);
    }
  };

  const handleCancelCrop = () => {
    setShowCropper(false);
    setImageSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    onImageChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const primaryBtn: React.CSSProperties = {
    background: "#4a6a32",
    boxShadow: "0 2px 0 rgba(74,106,50,0.3)",
  };

  // Cropper modal
  if (showCropper && imageSrc) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-[family-name:var(--font-inter)]">
        <div className="bg-white rounded-[14px] border border-pg-line p-6 w-full max-w-2xl max-h-[90dvh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-medium text-pg-ink">
              Crop image
            </h2>
            <button
              onClick={handleCancelCrop}
              className="text-pg-muted hover:text-pg-ink"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-[rgba(197,84,61,0.08)] border border-[rgba(197,84,61,0.25)] text-pg-coral px-4 py-3 rounded-[10px] text-sm font-medium mb-4">
              {error}
            </div>
          )}

          <div className="flex justify-center mb-4">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                className="max-h-[50dvh]"
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>

          <p className="text-sm text-pg-muted text-center mb-4">
            Drag to adjust the crop area. The image will be cropped to a circle.
          </p>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCancelCrop}
              className="flex-1 px-4 py-2 min-h-[44px] border border-pg-line rounded-[10px] text-pg-ink hover:bg-pg-cream font-semibold text-sm"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={handleCropComplete}
              disabled={loading}
              className="flex-1 px-4 py-2 min-h-[44px] text-white rounded-[10px] font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-[1.01]"
              style={primaryBtn}
            >
              {loading ? "Uploading..." : "Apply crop"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-pg-ink mb-1">
        {label}
      </label>

      {error && (
        <div className="bg-[rgba(197,84,61,0.08)] border border-[rgba(197,84,61,0.25)] text-pg-coral px-4 py-2 rounded-[10px] mb-2 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Hidden file input - always in DOM for reliable ref access */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {imageUrl ? (
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="Badge preview"
            className="w-24 h-24 object-cover rounded-full border-2 border-[rgba(107,142,78,0.35)] bg-pg-cream"
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = "none";
              const fallback = img.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          <div
            style={{ display: "none" }}
            className="w-24 h-24 rounded-full border-2 border-pg-coral bg-[rgba(197,84,61,0.08)] items-center justify-center text-[10px] font-semibold text-pg-coral text-center px-2"
          >
            Image failed to load
          </div>
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 bg-pg-coral text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:opacity-90"
          >
            &times;
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-pg-line rounded-full cursor-pointer hover:border-pg-accent hover:bg-[rgba(107,142,78,0.06)] transition-colors"
        >
          <svg
            className="w-8 h-8 text-pg-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      )}
      <p className="mt-1 text-xs text-pg-muted">
        Upload a custom image (optional)
      </p>
    </div>
  );
}
