"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import FamilyInviteCode from "@/components/family/FamilyInviteCode";
import BadgeManagementTabs from "@/components/settings/BadgeManagementTabs";

type Kid = {
  id: string;
  name: string | null;
  email: string;
};

type Props = {
  familyName: string;
  inviteCode: string;
  kids: Kid[];
  isHueConnected: boolean;
};

export default function SettingsPageContent({ familyName, inviteCode, kids, isHueConnected }: Props) {
  const t = useTranslations("settings");
  const tParent = useTranslations("parent");
  const tHue = useTranslations("hue");
  const [hueConnected, setHueConnected] = useState(isHueConnected);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnectHue = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/hue/auth");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      console.error("Failed to initiate Hue connection");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectHue = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/hue/disconnect", { method: "DELETE" });
      if (response.ok) {
        setHueConnected(false);
      }
    } catch {
      console.error("Failed to disconnect Hue");
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>
        <p className="text-gray-500 mt-1">{t("pageDesc")}</p>
      </div>

      {/* Family Info Card */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("familyInfo")}
        </h2>

        <div className="space-y-4">
          {/* Family Name */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <div className="text-sm text-gray-500">{t("familyName")}</div>
              <div className="font-medium text-gray-900">{familyName}</div>
            </div>
          </div>

          {/* Family Members */}
          <div className="py-3 border-b border-gray-100">
            <div className="text-sm text-gray-500 mb-2">{t("familyMembers")}</div>
            {kids.length === 0 ? (
              <p className="text-gray-500 text-sm">{tParent("noKidsYet")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {kids.map((kid) => (
                  <span
                    key={kid.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm"
                  >
                    <span>👤</span>
                    {kid.name || kid.email}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Invite Code */}
          <div className="py-3">
            <div className="text-sm text-gray-500 mb-3">{t("inviteCode")}</div>
            <div className="bg-gray-50 rounded-lg p-4">
              <FamilyInviteCode inviteCode={inviteCode} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{t("inviteCodeHint")}</p>
          </div>
        </div>
      </div>

      {/* Badge Management */}
      <BadgeManagementTabs />

      {/* Smart Home */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("smartHome")}
        </h2>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="font-medium text-gray-900">Philips Hue</div>
            <div className="text-sm text-gray-500">
              {hueConnected ? tHue("connected") : tHue("notConnected")}
            </div>
          </div>
          {hueConnected ? (
            <button
              onClick={handleDisconnectHue}
              disabled={isDisconnecting}
              className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              {isDisconnecting ? tHue("disconnecting") : tHue("disconnect")}
            </button>
          ) : (
            <button
              onClick={handleConnectHue}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isConnecting ? "..." : tHue("connect")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
