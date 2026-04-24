"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

type Chore = {
  id: string;
  title: string;
  defaultPoints: number;
};

type PointEntry = {
  id: string;
  points: number;
  note: string | null;
  photoUrl: string | null;
  date: string;
  chore: { title: string } | null;
  choreId?: string | null;
};

type BadgeLevelUpInfo = {
  choreTitle: string;
  choreIcon: string | null;
  newLevel: number;
  levelName: string | null;
  levelIcon: string | null;
  count: number;
  isFirstTime: boolean;
};

type AchievementBadgeInfo = {
  badgeId: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  icon: string;
};

type PointEntryFormProps = {
  kidId: string;
  entry?: PointEntry | null;
  onClose: () => void;
  onSuccess: (badgeLevelUp?: BadgeLevelUpInfo | null, achievementBadges?: AchievementBadgeInfo[] | null) => void;
};

// Helper to format date in local timezone as YYYY-MM-DD
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function PointEntryForm({
  kidId,
  entry,
  onClose,
  onSuccess,
}: PointEntryFormProps) {
  const [chores, setChores] = useState<Chore[]>([]);
  const [mode, setMode] = useState<"choose" | "chore" | "custom">(
    entry ? (entry.choreId ? "chore" : "custom") : "choose"
  );
  const [choreId, setChoreId] = useState(entry?.choreId || "");
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);
  const [customPoints, setCustomPoints] = useState(
    entry && !entry.choreId ? entry.points.toString() : ""
  );
  const [note, setNote] = useState(entry?.note || "");
  const [date, setDate] = useState(
    entry?.date
      ? toLocalDateString(new Date(entry.date))
      : toLocalDateString(new Date())
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(entry?.photoUrl || null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(entry?.photoUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generateBadge, setGenerateBadge] = useState(!entry);
  const [photosDisabled, setPhotosDisabled] = useState(false);
  const t = useTranslations("parent");
  const tCommon = useTranslations("common");
  const tPhotos = useTranslations("photos");

  const theme = {
    title: "text-[#2f2a1f]",
    label: "text-[#2f2a1f]",
    muted: "text-[#857d68]",
    close: "text-[#857d68] hover:text-[#2f2a1f]",
    input: "border-[rgba(68,55,32,0.14)] focus:ring-[#6b8e4e] focus:border-[#6b8e4e]",
    checkbox: "border-[rgba(68,55,32,0.14)] text-[#6b8e4e] focus:ring-[#6b8e4e]",
    errorBg: "bg-[rgba(197,84,61,0.08)] border border-[rgba(197,84,61,0.2)] text-[#c5543d]",
    cancelBtn: "border-[rgba(68,55,32,0.14)] text-[#2f2a1f] hover:bg-[#F9F4E8]",
    choreBtn: "bg-[#4a6a32] hover:bg-[#3d5a2a]",
    customBtn: "bg-[#6b8e4e] hover:bg-[#4a6a32]",
    choreBorder: "border-[rgba(68,55,32,0.14)] hover:border-[#4a6a32] hover:bg-[rgba(107,142,78,0.06)]",
    customBorder: "border-[rgba(68,55,32,0.14)] hover:border-[#6b8e4e] hover:bg-[rgba(107,142,78,0.06)]",
    choreIcon: "bg-[rgba(107,142,78,0.15)]",
    choreIconSvg: "text-[#4a6a32]",
    customIcon: "bg-[rgba(107,142,78,0.15)]",
    customIconSvg: "text-[#6b8e4e]",
    infoBg: "bg-[rgba(107,142,78,0.08)] border border-[rgba(107,142,78,0.2)]",
    infoText: "text-[#4a6a32]",
    photoBorder: "border-[rgba(68,55,32,0.14)] hover:border-[#4a6a32] hover:bg-[rgba(107,142,78,0.06)]",
    photoText: "text-[#857d68]",
  };

  useEffect(() => {
    fetchChores();
    fetch("/api/family")
      .then((res) => res.json())
      .then((data) => {
        if (data?.family?.photoProvider === "NONE") setPhotosDisabled(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // When editing and chores are loaded, find the selected chore
    if (entry?.choreId && chores.length > 0) {
      const chore = chores.find((c) => c.id === entry.choreId);
      if (chore) {
        setSelectedChore(chore);
      }
    }
  }, [entry, chores]);

  const fetchChores = async () => {
    try {
      const response = await fetch("/api/chores");
      const data = await response.json();
      if (response.ok) {
        setChores(data.chores.filter((c: Chore & { isActive: boolean }) => c.isActive));
      }
    } catch (error) {
      console.error("Failed to fetch chores:", error);
    }
  };

  const handleChoreSelect = (selectedChoreId: string) => {
    setChoreId(selectedChoreId);
    const chore = chores.find((c) => c.id === selectedChoreId);
    setSelectedChore(chore || null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    let pointsValue: number;

    if (mode === "chore") {
      if (!selectedChore) {
        setError(t("pleaseSelectChore"));
        return;
      }
      pointsValue = selectedChore.defaultPoints;
    } else {
      pointsValue = parseInt(customPoints);
      if (isNaN(pointsValue)) {
        setError(t("pointsMustBeNumber"));
        return;
      }
    }

    setLoading(true);

    let finalPhotoUrl = photoUrl;

    // Upload photo if a new one was selected
    if (photo) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", photo);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadData.error || tPhotos("uploadFailed"));
          setLoading(false);
          setUploading(false);
          return;
        }
        finalPhotoUrl = uploadData.url;
      } catch {
        setError(tPhotos("uploadFailed"));
        setLoading(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    try {
      const url = entry ? `/api/points/${entry.id}` : "/api/points";
      const method = entry ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kidId,
          choreId: mode === "chore" ? choreId : null,
          points: pointsValue,
          note: note || null,
          photoUrl: finalPhotoUrl,
          date,
          generateBadge:
            !entry && mode === "custom" && pointsValue > 0 && generateBadge,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      onSuccess(data.badgeLevelUp || null, data.achievementBadges || null);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  // Mode selection screen (only for new entries)
  if (mode === "choose" && !entry) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-xl font-bold ${theme.title}`}>{t("awardPoints")}</h2>
            <button
              onClick={onClose}
              className={theme.close}
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

          <p className={`${theme.muted} mb-6`}>{t("howToAwardPoints")}</p>

          <div className="space-y-3">
            <button
              onClick={() => setMode("chore")}
              className={`w-full flex items-center p-4 border-2 ${theme.choreBorder} rounded-lg transition-colors text-left`}
            >
              <div className={`flex-shrink-0 ${theme.choreIcon} rounded-full p-3 mr-4`}>
                <svg
                  className={`w-6 h-6 ${theme.choreIconSvg}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div>
                <div className={`font-medium ${theme.title}`}>{t("completedChore")}</div>
                <div className={`text-sm ${theme.muted}`}>
                  {t("completedChoreDesc")}
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode("custom")}
              className={`w-full flex items-center p-4 border-2 ${theme.customBorder} rounded-lg transition-colors text-left`}
            >
              <div className={`flex-shrink-0 ${theme.customIcon} rounded-full p-3 mr-4`}>
                <svg
                  className={`w-6 h-6 ${theme.customIconSvg}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <div>
                <div className={`font-medium ${theme.title}`}>{t("customAward")}</div>
                <div className={`text-sm ${theme.muted}`}>
                  {t("customAwardDesc")}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chore selection or custom points form
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            {!entry && (
              <button
                onClick={() => setMode("choose")}
                className={`mr-2 ${theme.close}`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <h2 className={`text-xl font-bold ${theme.title}`}>
              {entry
                ? t("editPoints")
                : mode === "chore"
                ? t("awardForChore")
                : t("customAward")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={theme.close}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`${theme.errorBg} px-4 py-3 rounded`}>
              {error}
            </div>
          )}

          {mode === "chore" ? (
            // Chore selection mode
            <div>
              <label
                htmlFor="chore"
                className="block text-sm font-medium ${theme.label} mb-1"
              >
                {t("selectChore")}
              </label>
              <select
                id="chore"
                value={choreId}
                onChange={(e) => handleChoreSelect(e.target.value)}
                required
                className="w-full px-3 py-2 border ${theme.input} rounded-md shadow-sm focus:outline-none"
              >
                <option value="">{t("chooseChore")}</option>
                {chores.map((chore) => (
                  <option key={chore.id} value={chore.id}>
                    {chore.title} ({chore.defaultPoints} {tCommon("pts")})
                  </option>
                ))}
              </select>

              {selectedChore && (
                <div className={`mt-3 p-3 ${theme.infoBg} rounded-md`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${theme.infoText}`}>{t("pointsToAward")}</span>
                    <span className={`text-lg font-bold ${theme.infoText}`}>
                      +{selectedChore.defaultPoints}
                    </span>
                  </div>
                </div>
              )}

              {chores.length === 0 && (
                <p className="mt-2 text-sm ${theme.muted}">
                  {t("noChoresDefinedYet")}
                </p>
              )}
            </div>
          ) : (
            // Custom points mode
            <div>
              <label
                htmlFor="points"
                className="block text-sm font-medium ${theme.label} mb-1"
              >
                {tCommon("points")}
              </label>
              <input
                id="points"
                type="number"
                required
                value={customPoints}
                onChange={(e) => setCustomPoints(e.target.value)}
                placeholder={t("pointsPlaceholder")}
                className="w-full px-3 py-2 border ${theme.input} rounded-md shadow-sm focus:outline-none"
              />
              <p className="mt-1 text-sm ${theme.muted}">
                {t("pointsHint")}
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium ${theme.label} mb-1"
            >
              {t("note")} {mode === "custom" && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required={mode === "custom"}
              rows={2}
              placeholder={
                mode === "chore"
                  ? t("noteOptionalPlaceholder")
                  : t("noteRequiredPlaceholder")
              }
              className="w-full px-3 py-2 border ${theme.input} rounded-md shadow-sm focus:outline-none"
            />
          </div>

          {!entry && mode === "custom" && (
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={generateBadge}
                onChange={(e) => setGenerateBadge(e.target.checked)}
                className={`mt-1 h-4 w-4 rounded ${theme.checkbox}`}
              />
              <span className={`text-sm ${theme.label}`}>
                <span className="font-medium">🎨 {t("generateBadge")}</span>
                <span className="block text-xs text-gray-500">
                  {t("generateBadgeHint")}
                </span>
              </span>
            </label>
          )}

          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium ${theme.label} mb-1"
            >
              {t("date")}
            </label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border ${theme.input} rounded-md shadow-sm focus:outline-none"
            />
          </div>

          {!photosDisabled && (
          <div>
            <label className="block text-sm font-medium ${theme.label} mb-1">
              {tPhotos("photo")} <span className="${theme.muted}">({tPhotos("optional")})</span>
            </label>

            {photoPreview ? (
              <div className="relative inline-block">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                >
                  &times;
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed ${theme.photoBorder} rounded-lg cursor-pointer transition-colors`}>
                <svg
                  className="w-8 h-8 ${theme.muted}"
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
                <span className="mt-1 text-sm ${theme.muted}">{tPhotos("addPhoto")}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
            <p className="mt-1 text-xs text-gray-500">{tPhotos("photoHelp")}</p>
          </div>
          )}

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
              disabled={loading || uploading || (mode === "chore" && !selectedChore)}
              className={`flex-1 px-4 py-2 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === "chore"
                  ? theme.choreBtn
                  : theme.customBtn
              }`}
            >
              {uploading
                ? "Uploading..."
                : loading
                ? tCommon("saving")
                : entry
                ? tCommon("update")
                : mode === "chore"
                ? t("awardPoints")
                : t("addCustomAward")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
