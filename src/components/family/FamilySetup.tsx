"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

type User = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
};

export default function FamilySetup({ user }: { user: User }) {
  const router = useRouter();
  const { update } = useSession();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useTranslations("family");
  const tCommon = useTranslations("common");

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: familyName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t("failedToCreateFamily"));
        setLoading(false);
        return;
      }

      // Update session with new familyId
      await update({ familyId: data.family.id });

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(tCommon("somethingWentWrong"));
      setLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/family/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t("failedToJoinFamily"));
        setLoading(false);
        return;
      }

      // Update session with new familyId and role
      await update({
        familyId: data.user.familyId,
        role: data.user.role,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(tCommon("somethingWentWrong"));
      setLoading(false);
    }
  };

  if (mode === "choose") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div>
            <h2 className="text-center text-3xl font-bold text-gray-900">
              {t("welcome")}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t("letsSetup")}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={() => setMode("create")}
              className="w-full flex flex-col items-center p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <svg
                className="w-12 h-12 text-blue-600 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-lg font-medium text-gray-900">
                {t("createFamily")}
              </span>
              <span className="text-sm text-gray-500 mt-1">
                {t("startFreshAsParent")}
              </span>
            </button>

            <button
              onClick={() => setMode("join")}
              className="w-full flex flex-col items-center p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <svg
                className="w-12 h-12 text-green-600 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="text-lg font-medium text-gray-900">
                {t("joinFamily")}
              </span>
              <span className="text-sm text-gray-500 mt-1">
                {t("useInviteCode")}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div>
            <button
              onClick={() => setMode("choose")}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
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
              {tCommon("back")}
            </button>
            <h2 className="mt-4 text-center text-3xl font-bold text-gray-900">
              {t("createYourFamily")}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t("chooseFamilyName")}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleCreateFamily}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="familyName"
                className="block text-sm font-medium text-gray-700"
              >
                {t("familyName")}
              </label>
              <input
                id="familyName"
                type="text"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder={t("familyNamePlaceholder")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("creating") : t("createFamily")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Join mode
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <button
            onClick={() => setMode("choose")}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
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
            {tCommon("back")}
          </button>
          <h2 className="mt-4 text-center text-3xl font-bold text-gray-900">
            {t("joinFamily")}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t("enterInviteCode")}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleJoinFamily}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="inviteCode"
              className="block text-sm font-medium text-gray-700"
            >
              {t("inviteCode")}
            </label>
            <input
              id="inviteCode"
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder={t("enterInviteCodePlaceholder")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("joining") : t("joinFamily")}
          </button>
        </form>
      </div>
    </div>
  );
}
