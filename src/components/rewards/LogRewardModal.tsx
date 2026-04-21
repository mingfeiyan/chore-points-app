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

  const theme = {
    title: "text-[#2f2a1f]",
    label: "text-[#2f2a1f]",
    muted: "text-[#857d68]",
    close: "text-[#857d68] hover:text-[#2f2a1f]",
    input: "border-[rgba(68,55,32,0.14)] focus:ring-[#6b8e4e] focus:border-[#6b8e4e]",
    errorBg: "bg-[rgba(197,84,61,0.08)] border border-[rgba(197,84,61,0.2)] text-[#c5543d]",
    cancelBtn: "border-[rgba(68,55,32,0.14)] text-[#2f2a1f] hover:bg-[#F9F4E8]",
    submitBtn: "bg-[#4a6a32] text-white hover:bg-[#3d5a2a]",
    photoBorder: "border-[rgba(68,55,32,0.14)] hover:border-[#4a6a32] hover:bg-[rgba(107,142,78,0.06)]",
    photoText: "text-[#857d68]",
  };

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
          <h2 className={`text-xl font-bold ${theme.title}`}>{t("title")}</h2>
          <button
            onClick={onClose}
            className={theme.close}
            aria-label={tCommon("cancel")}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`${theme.errorBg} px-4 py-3 rounded`}>
              {error}
            </div>
          )}

          {kids.length > 1 && (
            <div>
              <label className="block text-sm font-medium ${theme.label} mb-1">
                {t("kid")}
              </label>
              <select
                value={kidId}
                onChange={(e) => setKidId(e.target.value)}
                className="w-full px-3 py-2 border ${theme.input} rounded-md shadow-sm focus:outline-none"
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
            <label htmlFor="note" className="block text-sm font-medium ${theme.label} mb-1">
              {t("note")}
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              maxLength={100}
              className="w-full px-3 py-2 border ${theme.input} rounded-md shadow-sm focus:outline-none"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="points" className="block text-sm font-medium ${theme.label} mb-1">
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
              className="w-full px-3 py-2 border ${theme.input} rounded-md shadow-sm focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium ${theme.label} mb-1">
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
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed ${theme.photoBorder} rounded-lg cursor-pointer transition-colors`}>
                {uploading ? (
                  <span className="text-sm ${theme.photoText}">{t("uploading")}</span>
                ) : (
                  <>
                    <span className="text-3xl mb-1">📸</span>
                    <span className="text-sm ${theme.photoText}">{t("photoHint")}</span>
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
              className={`flex-1 px-4 py-2 border ${theme.cancelBtn} rounded-md font-medium`}
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className={`flex-1 px-4 py-2 ${theme.submitBtn} rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? tCommon("saving") : t("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
