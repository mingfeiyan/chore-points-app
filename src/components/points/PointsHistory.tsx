"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type PointEntry = {
  id: string;
  points: number;
  note: string | null;
  date: string;
  chore: { title: string } | null;
  createdBy: { name: string | null; email: string };
  redemption: { reward: { title: string } } | null;
};

type PointsHistoryProps = {
  kidId: string;
};

export default function PointsHistory({ kidId }: PointsHistoryProps) {
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("history");
  const tCommon = useTranslations("common");

  useEffect(() => {
    fetchPoints();
  }, [kidId]);

  const fetchPoints = async () => {
    try {
      const response = await fetch(`/api/points?kidId=${kidId}`);
      const data = await response.json();
      if (response.ok) {
        setEntries(data.entries);
      }
    } catch (error) {
      console.error("Failed to fetch points:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-500">
          {t("noEntries")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("date")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("chore")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("pointsColumn")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("note")}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {new Date(entry.date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {entry.chore?.title || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`text-sm font-semibold ${
                    entry.points >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {entry.points >= 0 ? "+" : ""}
                  {entry.points}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {entry.redemption ? (
                  <span className="text-purple-600">
                    {t("redeemed")} {entry.redemption.reward.title}
                  </span>
                ) : (
                  entry.note || "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
