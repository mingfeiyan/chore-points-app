"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import RewardForm from "./RewardForm";

type Reward = {
  id: string;
  title: string;
  costPoints: number;
  imageUrl: string | null;
  createdAt?: string;
  createdBy: { name: string | null; email: string };
  updatedBy: { name: string | null; email: string };
};

type Redemption = {
  id: string;
  status: string;
  requestedAt: string;
  resolvedAt: string | null;
  kid: { name: string | null; email: string };
  reward: { title: string; costPoints: number; imageUrl: string | null };
  resolvedBy: { name: string | null; email: string } | null;
};

export default function RewardsList() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const t = useTranslations("parent");
  const tCommon = useTranslations("common");

  useEffect(() => {
    fetchRewards();
    fetchRedemptions();
  }, []);

  const fetchRewards = async () => {
    try {
      const response = await fetch("/api/rewards");
      const data = await response.json();
      if (response.ok) {
        setRewards(data.rewards);
      }
    } catch (error) {
      console.error("Failed to fetch rewards:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRedemptions = async () => {
    try {
      const response = await fetch("/api/redemptions?status=PENDING");
      const data = await response.json();
      if (response.ok) {
        setRedemptions(data.redemptions);
      }
    } catch (error) {
      console.error("Failed to fetch redemptions:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDeleteReward"))) return;

    try {
      const response = await fetch(`/api/rewards/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRewards(rewards.filter((r) => r.id !== id));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete reward");
      }
    } catch (error) {
      console.error("Failed to delete reward:", error);
      alert("Failed to delete reward");
    }
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingReward(null);
  };

  const handleFormSuccess = (reward: Reward) => {
    if (editingReward) {
      setRewards(rewards.map((r) => (r.id === reward.id ? reward : r)));
    } else {
      setRewards([reward, ...rewards]);
    }
    handleFormClose();
  };

  const handleApprove = async (redemptionId: string) => {
    if (!confirm(t("confirmApprove"))) return;

    try {
      const response = await fetch(`/api/redemptions/${redemptionId}/approve`, {
        method: "PUT",
      });

      const data = await response.json();

      if (response.ok) {
        setRedemptions(redemptions.filter((r) => r.id !== redemptionId));
        alert(t("redemptionApproved"));
      } else {
        alert(data.error || t("failedApprove"));
      }
    } catch (error) {
      console.error("Failed to approve redemption:", error);
      alert(t("failedApprove"));
    }
  };

  const handleDeny = async (redemptionId: string) => {
    if (!confirm(t("confirmDeny"))) return;

    try {
      const response = await fetch(`/api/redemptions/${redemptionId}/deny`, {
        method: "PUT",
      });

      const data = await response.json();

      if (response.ok) {
        setRedemptions(redemptions.filter((r) => r.id !== redemptionId));
        alert(t("redemptionDenied"));
      } else {
        alert(data.error || t("failedDeny"));
      }
    } catch (error) {
      console.error("Failed to deny redemption:", error);
      alert(t("failedDeny"));
    }
  };

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  return (
    <div>
      {/* Pending Redemptions Section */}
      {redemptions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t("pendingRedemptions")} ({redemptions.length})
          </h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="space-y-4">
              {redemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {redemption.reward.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t("requestedBy")} {redemption.kid.name || redemption.kid.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t("costLabel")} {redemption.reward.costPoints} {tCommon("points")} •{" "}
                      {new Date(redemption.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleApprove(redemption.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                    >
                      {t("approve")}
                    </button>
                    <button
                      onClick={() => handleDeny(redemption.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                    >
                      {t("deny")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rewards Management Section */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t("rewardsCatalog")}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
        >
          {t("addReward")}
        </button>
      </div>

      {rewards.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">
            {t("noRewardsYet")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow"
            >
              {reward.imageUrl && (
                <div className="h-48 overflow-hidden bg-gray-200">
                  <img
                    src={reward.imageUrl}
                    alt={reward.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {reward.title}
                </h3>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-purple-600">
                    {reward.costPoints} pts
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  {t("createdByLabel")} {reward.createdBy.name || reward.createdBy.email}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(reward)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                  >
                    {t("delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RewardForm
          reward={editingReward}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
