"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import DishCard from "./DishCard";

type Dish = {
  id: string;
  name: string;
  photoUrl: string;
  totalVotes: number;
};

type Vote = {
  id: string;
  dishId: string | null;
  suggestedDishName: string | null;
  voter: { id: string; name: string | null; email: string };
};

export default function VotingGrid() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [suggestName, setSuggestName] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    Promise.all([fetchDishes(), fetchVotes()]).then(() => setLoading(false));
  }, []);

  const fetchDishes = async () => {
    try {
      const response = await fetch("/api/dishes");
      const data = await response.json();
      if (response.ok) {
        setDishes(data.dishes);
      }
    } catch (err) {
      console.error("Failed to fetch dishes:", err);
    }
  };

  const fetchVotes = async () => {
    try {
      const response = await fetch("/api/votes");
      const data = await response.json();
      if (response.ok) {
        setVotes(data.votes);
        // Extract my votes (assumes current user is in the response)
        const myDishVotes = new Set<string>(
          data.votes
            .filter((v: Vote) => v.dishId)
            .map((v: Vote) => v.dishId as string)
        );
        setMyVotes(myDishVotes);
      }
    } catch (err) {
      console.error("Failed to fetch votes:", err);
    }
  };

  const getVoteCount = (dishId: string) => {
    return votes.filter((v) => v.dishId === dishId).length;
  };

  const handleVote = async (dishId: string) => {
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishId }),
      });

      if (response.ok) {
        setMyVotes(new Set([...myVotes, dishId]));
        fetchVotes();
      }
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  const handleUnvote = async (dishId: string) => {
    const vote = votes.find((v) => v.dishId === dishId);
    if (!vote) return;

    try {
      const response = await fetch(`/api/votes/${vote.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const newVotes = new Set(myVotes);
        newVotes.delete(dishId);
        setMyVotes(newVotes);
        fetchVotes();
      }
    } catch (err) {
      console.error("Failed to remove vote:", err);
    }
  };

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestName.trim()) return;

    setSuggesting(true);
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestedDishName: suggestName }),
      });

      if (response.ok) {
        setSuggestName("");
        fetchVotes();
      }
    } catch (err) {
      console.error("Failed to suggest:", err);
    } finally {
      setSuggesting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  const favorites = dishes.filter((d) => d.totalVotes >= 5);
  const regularDishes = dishes.filter((d) => d.totalVotes < 5);

  return (
    <div>
      {/* Suggest New Dish */}
      <form onSubmit={handleSuggest} className="mb-6 flex gap-2">
        <input
          type="text"
          value={suggestName}
          onChange={(e) => setSuggestName(e.target.value)}
          placeholder={t("suggestPlaceholder")}
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <button
          type="submit"
          disabled={suggesting || !suggestName.trim()}
          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
        >
          {t("suggest")}
        </button>
      </form>

      {/* Family Favorites */}
      {favorites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            {t("familyFavorites")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {favorites.map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                voteCount={getVoteCount(dish.id)}
                isVoted={myVotes.has(dish.id)}
                onVote={() => handleVote(dish.id)}
                onUnvote={() => handleUnvote(dish.id)}
                showVoteButton
              />
            ))}
          </div>
        </div>
      )}

      {/* All Dishes */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">{t("allDishes")}</h2>
        {regularDishes.length === 0 && favorites.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">{t("noDishesYet")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {regularDishes.map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                voteCount={getVoteCount(dish.id)}
                isVoted={myVotes.has(dish.id)}
                onVote={() => handleVote(dish.id)}
                onUnvote={() => handleUnvote(dish.id)}
                showVoteButton
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
