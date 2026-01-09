"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import MilestoneForm from "./MilestoneForm";

type Kid = {
  id: string;
  name: string | null;
  email: string;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  date: string;
  imageUrl: string | null;
  kid: Kid;
  createdBy: { name: string | null; email: string };
  createdAt: string;
};

type MilestonesListProps = {
  kids: Kid[];
};

export default function MilestonesList({ kids }: MilestonesListProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [filterKidId, setFilterKidId] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const t = useTranslations("milestones");
  const tCommon = useTranslations("common");

  useEffect(() => {
    fetchMilestones();
  }, [filterKidId]);

  const fetchMilestones = async () => {
    try {
      const url = filterKidId
        ? `/api/milestones?kidId=${filterKidId}`
        : "/api/milestones";
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        setMilestones(data.milestones);
      }
    } catch (error) {
      console.error("Failed to fetch milestones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (milestone: Milestone) => {
    if (editingMilestone) {
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestone.id ? milestone : m))
      );
    } else {
      setMilestones((prev) => [milestone, ...prev]);
    }
    setShowForm(false);
    setEditingMilestone(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/milestones/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMilestones((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete milestone:", error);
    }
    setDeleteConfirm(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-lg p-6 animate-pulse h-32"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header with Add Button and Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
          {kids.length > 1 && (
            <select
              value={filterKidId}
              onChange={(e) => setFilterKidId(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t("allKids")}</option>
              {kids.map((kid) => (
                <option key={kid.id} value={kid.id}>
                  {kid.name || kid.email}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => {
            setEditingMilestone(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          {t("addMilestone")}
        </button>
      </div>

      {/* Empty State */}
      {milestones.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">🌟</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("noMilestones")}
          </h3>
          <p className="text-gray-500 mb-4">
            {t("startTracking")}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            {t("addFirstMilestone")}
          </button>
        </div>
      ) : (
        /* Timeline View */
        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="flex">
                {/* Icon/Image Side */}
                <div className="w-24 sm:w-32 bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0">
                  {milestone.imageUrl ? (
                    <img
                      src={milestone.imageUrl}
                      alt={milestone.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl sm:text-5xl">
                      {milestone.icon || "🌟"}
                    </span>
                  )}
                </div>

                {/* Content Side */}
                <div className="flex-1 p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Date Badge */}
                      <div className="text-xs text-purple-600 font-semibold mb-1">
                        {formatDate(milestone.date)}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {milestone.icon && (
                          <span className="mr-2">{milestone.icon}</span>
                        )}
                        {milestone.title}
                      </h3>

                      {/* Kid Name (if multiple kids) */}
                      {kids.length > 1 && (
                        <div className="text-sm text-gray-500 mb-1">
                          {milestone.kid.name || milestone.kid.email}
                        </div>
                      )}

                      {/* Description */}
                      {milestone.description && (
                        <p className="text-gray-600 text-sm mt-2">
                          {milestone.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingMilestone(milestone);
                          setShowForm(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t("edit")}
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      {deleteConfirm === milestone.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(milestone.id)}
                            className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                            title={t("confirmDelete")}
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
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title={tCommon("cancel")}
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(milestone.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t("delete")}
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <MilestoneForm
          milestone={editingMilestone}
          kids={kids}
          onClose={() => {
            setShowForm(false);
            setEditingMilestone(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
