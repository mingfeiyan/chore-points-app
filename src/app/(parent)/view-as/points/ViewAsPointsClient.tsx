"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKidMode } from "@/components/providers/KidModeProvider";
import KidPointsView from "@/components/points/KidPointsView";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function ViewAsPointsClient() {
  const { viewingAsKid, isKidMode } = useKidMode();
  const router = useRouter();
  const t = useTranslations("points");

  useEffect(() => {
    if (!isKidMode) {
      router.push("/dashboard");
    }
  }, [isKidMode, router]);

  if (!viewingAsKid) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header similar to KidPointsHeader but for parent viewing */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t("myPoints")}</h1>
          <p className="mt-1 text-gray-600">
            {t("trackPoints")}
          </p>
          <div className="mt-4">
            <Link
              href="/view-as/redeem"
              className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              {t("redeemRewards")}
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <KidPointsView kidId={viewingAsKid.id} readOnly />
        </div>
      </div>
    </div>
  );
}
