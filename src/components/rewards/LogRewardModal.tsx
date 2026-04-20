"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Kid = {
  id: string;
  name: string | null;
  email: string;
};

type Props = {
  onClose: () => void;
  onSuccess?: () => void;
};

export default function LogRewardModal({ onClose, onSuccess }: Props) {
  const t = useTranslations("logReward");
  const tCommon = useTranslations("common");

  const [kids, setKids] = useState<Kid[]>([]);
  const [kidId, setKidId] = useState("");
  const [note, setNote] = useState("");
  const [points, setPoints] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadKids = async () => {
      try {
        const res = await fetch("/api/family/kids");
        const data = await res.json();
        if (res.ok && Array.isArray(data.kids)) {
          setKids(data.kids);
          if (data.kids.length === 1) setKidId(data.kids[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch kids:", err);
      }
    };
    loadKids();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setPhotoUrl(data.url);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!kidId) {
      setError(t("kidRequired"));
      return;
    }
    const trimmed = note.trim();
    if (!trimmed) {
      setError(t("noteRequired"));
      return;
    }
    const pointsNum = Number(points);
    if (!Number.isInteger(pointsNum) || pointsNum < 1 || pointsNum > 999) {
      setError(t("pointsRange"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/point-entries/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kidId,
          note: trimmed,
          points: pointsNum,
          photoUrl: photoUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || tCommon("error"));
        return;
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Submit error:", err);
      setError(tCommon("error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">{t("title")}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={tCommon("cancel")}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {kids.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("kid")}
              </label>
              <select
                value={kidId}
                onChange={(e) => setKidId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">{t("selectKid")}</option>
                {kids.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name || k.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
              {t("note")}
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">
              {t("points")}
            </label>
            <input
              id="points"
              type="number"
              inputMode="numeric"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              min={1}
              max={999}
              placeholder="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("photo")}
            </label>
            {photoUrl ? (
              <div className="relative inline-block">
                <img
                  src={photoUrl}
                  alt="Reward preview"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                  aria-label={tCommon("delete")}
                >
                  &times;
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                {uploading ? (
                  <span className="text-sm text-gray-500">{t("uploading")}</span>
                ) : (
                  <>
                    <span className="text-3xl mb-1">📸</span>
                    <span className="text-sm text-gray-500">{t("photoHint")}</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? tCommon("saving") : t("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
