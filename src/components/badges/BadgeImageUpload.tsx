"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
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

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    if (!imgRef.current || !completedCrop) return null;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.9
      );
    });
  }, [completedCrop]);

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

  // Show cropper modal
  if (showCropper && imageSrc) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Crop Image</h2>
            <button
              onClick={handleCancelCrop}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
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
                className="max-h-[50vh]"
              />
            </ReactCrop>
          </div>

          <p className="text-sm text-gray-500 text-center mb-4">
            Drag to adjust the crop area. The image will be cropped to a circle.
          </p>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCancelCrop}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={handleCropComplete}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Uploading..." : "Apply Crop"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-2 text-sm">
          {error}
        </div>
      )}

      {imageUrl ? (
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="Badge preview"
            className="w-24 h-24 object-cover rounded-full border-2 border-purple-200"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
          >
            &times;
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-full cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
          <svg
            className="w-8 h-8 text-gray-400"
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}
      <p className="mt-1 text-xs text-gray-500">
        Upload a custom image (optional)
      </p>
    </div>
  );
}
