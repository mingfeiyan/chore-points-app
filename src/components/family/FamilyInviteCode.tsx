"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function FamilyInviteCode({ inviteCode: initialCode }: { inviteCode: string }) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const t = useTranslations("family");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = inviteCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      const response = await fetch("/api/family/refresh-code", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setInviteCode(data.inviteCode);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to refresh invite code:", err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="text-sm text-gray-500">{t("familyInviteCode")}</div>
      <div className="flex items-center gap-2">
        {showCode ? (
          <code className="bg-gray-100 px-3 py-1.5 rounded font-mono text-sm tracking-wider">
            {inviteCode}
          </code>
        ) : (
          <button
            onClick={() => setShowCode(true)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {t("showCode")}
          </button>
        )}
        <button
          onClick={handleCopy}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            copied
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          }`}
        >
          {copied ? t("copied") : t("copy")}
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
          title={t("generateNewCode")}
        >
          {refreshing ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
      </div>
      {showCode && (
        <p className="text-xs text-gray-400">
          {t("shareCodeHint")}
        </p>
      )}
    </div>
  );
}
