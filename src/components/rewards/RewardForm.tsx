"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Reward = {
  id: string;
  title: string;
  costPoints: number;
  imageUrl: string | null;
  createdAt?: string;
  createdBy: { name: string | null; email: string };
  updatedBy: { name: string | null; email: string };
};

type RewardFormProps = {
  reward?: Reward | null;
  onClose: () => void;
  onSuccess: (reward: Reward) => void;
};

export default function RewardForm({
  reward,
  onClose,
  onSuccess,
}: RewardFormProps) {
  const [title, setTitle] = useState(reward?.title || "");
  const [costPoints, setCostPoints] = useState(
    reward?.costPoints?.toString() || ""
  );
  const [imageUrl, setImageUrl] = useState(reward?.imageUrl || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useTranslations("parent");
  const tCommon = useTranslations("common");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const points = parseInt(costPoints);
    if (isNaN(points) || points <= 0) {
      setError(t("costPositive"));
      return;
    }

    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }

    setLoading(true);

    try {
      const url = reward ? `/api/rewards/${reward.id}` : "/api/rewards";
      const method = reward ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          costPoints: points,
          imageUrl: imageUrl.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || tCommon("error"));
        setLoading(false);
        return;
      }

      onSuccess(data.reward);
    } catch {
      setError(tCommon("error"));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {reward ? t("editReward") : t("addRewardTitle")}
          </h2>
          <button
            onClick={onClose}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("rewardTitle")}
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Extra screen time, Ice cream trip"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="costPoints"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("costPoints")}
            </label>
            <input
              id="costPoints"
              type="number"
              required
              min="1"
              value={costPoints}
              onChange={(e) => setCostPoints(e.target.value)}
              placeholder="e.g., 50"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="imageUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("imageUrl")}
            </label>
            <input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              {t("imageUrlHelp")}
            </p>
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("saving") : reward ? t("update") : t("add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
