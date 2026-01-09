"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKidMode } from "@/components/providers/KidModeProvider";
import { useTranslations } from "next-intl";

type Kid = {
  id: string;
  name: string | null;
  email: string;
};

export default function KidModeSelector() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);
  const { setViewingAsKid } = useKidMode();
  const router = useRouter();
  const t = useTranslations("kidMode");

  useEffect(() => {
    fetchKids();
  }, []);

  const fetchKids = async () => {
    try {
      const response = await fetch("/api/family/kids");
      const data = await response.json();
      if (response.ok) {
        setKids(data.kids);
      }
    } catch (error) {
      console.error("Failed to fetch kids:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAsKid = (kid: Kid) => {
    setViewingAsKid(kid);
    router.push("/view-as/points");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (kids.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t("viewAsKid")}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {t("viewAsKidDesc")}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kids.map((kid) => (
          <button
            key={kid.id}
            onClick={() => handleViewAsKid(kid)}
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg hover:from-green-100 hover:to-teal-100 hover:border-green-300 transition-all"
          >
            <span className="text-2xl">👤</span>
            <span className="font-medium text-gray-900 truncate">
              {kid.name || kid.email}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
