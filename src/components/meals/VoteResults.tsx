"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Vote = {
  id: string;
  dishId: string | null;
  suggestedDishName: string | null;
  dish: {
    id: string;
    name: string;
    photoUrl: string;
    totalVotes: number;
  } | null;
  voter: {
    id: string;
    name: string | null;
    email: string;
  };
};

type DishVotes = {
  dish: {
    id: string;
    name: string;
    photoUrl: string;
    totalVotes: number;
  };
  votes: Vote[];
};

type SuggestionVotes = {
  name: string;
  votes: Vote[];
};

export default function VoteResults() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  const [votes, setVotes] = useState<Vote[]>([]);
  const [weekStart, setWeekStart] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVotes();
  }, []);

  const fetchVotes = async () => {
    try {
      const response = await fetch("/api/votes");
      const data = await response.json();
      if (response.ok) {
        setVotes(data.votes);
        setWeekStart(data.weekStart);
      }
    } catch (err) {
      console.error("Failed to fetch votes:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  // Group votes by dish
  const dishVotesMap = new Map<string, DishVotes>();
  const suggestionVotesMap = new Map<string, SuggestionVotes>();

  votes.forEach((vote) => {
    if (vote.dishId && vote.dish) {
      const existing = dishVotesMap.get(vote.dishId);
      if (existing) {
        existing.votes.push(vote);
      } else {
        dishVotesMap.set(vote.dishId, {
          dish: vote.dish,
          votes: [vote],
        });
      }
    } else if (vote.suggestedDishName) {
      const existing = suggestionVotesMap.get(vote.suggestedDishName);
      if (existing) {
        existing.votes.push(vote);
      } else {
        suggestionVotesMap.set(vote.suggestedDishName, {
          name: vote.suggestedDishName,
          votes: [vote],
        });
      }
    }
  });

  // Sort by vote count
  const sortedDishes = Array.from(dishVotesMap.values()).sort(
    (a, b) => b.votes.length - a.votes.length
  );

  const sortedSuggestions = Array.from(suggestionVotesMap.values()).sort(
    (a, b) => b.votes.length - a.votes.length
  );

  const hasAnyVotes = sortedDishes.length > 0 || sortedSuggestions.length > 0;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        {t("weekResets")} •{" "}
        {weekStart && new Date(weekStart).toLocaleDateString()}
      </p>

      {!hasAnyVotes ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">{t("noVotesYet")}</p>
        </div>
      ) : (
        <>
          {/* Dish Votes */}
          {sortedDishes.length > 0 && (
            <div className="space-y-4 mb-8">
              {sortedDishes.map(({ dish, votes: dishVotes }, index) => (
                <div
                  key={dish.id}
                  className="bg-white rounded-lg shadow p-4 flex items-center gap-4"
                >
                  <span className="text-2xl font-bold text-gray-300 w-8">
                    #{index + 1}
                  </span>
                  <img
                    src={dish.photoUrl}
                    alt={dish.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{dish.name}</h3>
                      {dish.totalVotes >= 5 && (
                        <span className="text-yellow-500">*</span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-orange-500">
                      {dishVotes.length} {t("votes")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t("votedBy")}:{" "}
                      {dishVotes
                        .map((v) => v.voter.name || v.voter.email)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {sortedSuggestions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                {t("suggestedDishes")}
              </h2>
              <div className="space-y-3">
                {sortedSuggestions.map(({ name, votes: suggestionVotes }) => (
                  <div
                    key={name}
                    className="bg-white rounded-lg shadow p-4 flex items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                      <span aria-hidden="true">*</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{name}</h3>
                      <p className="text-lg font-bold text-orange-500">
                        {suggestionVotes.length} {t("votes")}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t("votedBy")}:{" "}
                        {suggestionVotes
                          .map((v) => v.voter.name || v.voter.email)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
