"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import PointEntryForm from "./PointEntryForm";
import BadgeLevelUpToast from "@/components/badges/BadgeLevelUpToast";
import AchievementBadgeToast from "@/components/badges/AchievementBadgeToast";

type Kid = {
  id: string;
  name: string | null;
  email: string;
};

type PointEntry = {
  id: string;
  points: number;
  note: string | null;
  photoUrl: string | null;
  date: string;
  chore: { title: string } | null;
  choreId?: string | null;
  createdBy: { name: string | null; email: string };
  updatedBy: { name: string | null; email: string };
  redemption: { reward: { title: string } } | null;
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

export default function PointsLedger() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [selectedKid, setSelectedKid] = useState<Kid | null>(null);
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PointEntry | null>(null);
  const [badgeLevelUp, setBadgeLevelUp] = useState<BadgeLevelUpInfo | null>(null);
  const [achievementBadges, setAchievementBadges] = useState<AchievementBadgeInfo[]>([]);
  const t = useTranslations("parent");
  const tCommon = useTranslations("common");
  const tHistory = useTranslations("history");
  const tPhotos = useTranslations("photos");
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetchKids();
  }, []);

  useEffect(() => {
    if (selectedKid) {
      fetchPoints(selectedKid.id);
    }
  }, [selectedKid]);

  const fetchKids = async () => {
    try {
      const response = await fetch("/api/family/kids");
      const data = await response.json();
      if (response.ok && data.kids.length > 0) {
        setKids(data.kids);
        setSelectedKid(data.kids[0]);
      }
    } catch (error) {
      console.error("Failed to fetch kids:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPoints = async (kidId: string) => {
    try {
      const response = await fetch(`/api/points?kidId=${kidId}`);
      const data = await response.json();
      if (response.ok) {
        setEntries(data.entries);
        setTotalPoints(data.totalPoints);
      }
    } catch (error) {
      console.error("Failed to fetch points:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDeleteEntry"))) return;

    try {
      const response = await fetch(`/api/points/${id}`, {
        method: "DELETE",
      });

      if (response.ok && selectedKid) {
        fetchPoints(selectedKid.id);
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  const handleEdit = (entry: PointEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleFormSuccess = (levelUpInfo?: BadgeLevelUpInfo | null, newAchievementBadges?: AchievementBadgeInfo[] | null) => {
    if (selectedKid) {
      fetchPoints(selectedKid.id);
    }
    handleFormClose();
    if (levelUpInfo) {
      setBadgeLevelUp(levelUpInfo);
    }
    if (newAchievementBadges && newAchievementBadges.length > 0) {
      setAchievementBadges(newAchievementBadges);
    }
  };

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  if (kids.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">
          {t("noKidsInFamily")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        {selectedKid && (
          <div className="flex items-center space-x-4">
            <span className="text-2xl font-bold text-gray-900">
              {selectedKid.name || selectedKid.email}
            </span>
            <span className="text-2xl font-bold text-blue-600">
              {totalPoints} {tCommon("points")}
            </span>
          </div>
        )}

        <button
          onClick={() => setShowForm(true)}
          disabled={!selectedKid}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("addPoints")}
        </button>
      </div>

      {selectedKid && entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">
            {t("noPointEntries")}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("date")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tHistory("chore")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tCommon("points")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("note")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {tPhotos("photo")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("addedBy")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("actions")}
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
                    {entry.chore?.title || (entry.points > 0 ? tHistory("custom") : "-")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-semibold ${
                        entry.points >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {entry.points >= 0 ? "+" : ""}
                      {entry.points}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {entry.redemption ? (
                      <span className="text-purple-600">
                        {tHistory("redeemed")} {entry.redemption.reward.title}
                      </span>
                    ) : (
                      entry.note || "-"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {entry.photoUrl ? (
                      <img
                        src={entry.photoUrl}
                        alt="Entry photo"
                        className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setViewingPhoto(entry.photoUrl)}
                      />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.createdBy.name || entry.createdBy.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!entry.redemption && (
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-blue-600 hover:text-blue-900 px-2 py-1 hover:bg-blue-50 rounded"
                        >
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-900 px-2 py-1 hover:bg-red-50 rounded"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && selectedKid && (
        <PointEntryForm
          kidId={selectedKid.id}
          entry={editingEntry}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Photo viewing modal */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={viewingPhoto}
              alt="Full size"
              className="max-h-[90vh] w-auto rounded-lg"
            />
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Badge level-up notification */}
      {badgeLevelUp && (
        <BadgeLevelUpToast
          levelUpInfo={badgeLevelUp}
          onClose={() => setBadgeLevelUp(null)}
        />
      )}

      {/* Achievement badge notification */}
      {achievementBadges.length > 0 && (
        <AchievementBadgeToast
          badges={achievementBadges}
          onClose={() => setAchievementBadges([])}
        />
      )}
    </div>
  );
}
