"use client";

import { useTranslations } from "next-intl";

type DishCardProps = {
  dish: {
    id: string;
    name: string;
    photoUrl: string;
    totalVotes: number;
  };
  voteCount?: number;
  isVoted?: boolean;
  onVote?: () => void;
  onUnvote?: () => void;
  showVoteButton?: boolean;
};

export default function DishCard({
  dish,
  voteCount = 0,
  isVoted = false,
  onVote,
  onUnvote,
  showVoteButton = false,
}: DishCardProps) {
  const t = useTranslations("meals");
  const isFavorite = dish.totalVotes >= 5;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-32 sm:h-40 overflow-hidden bg-gray-200 relative">
        <img
          src={dish.photoUrl}
          alt={dish.name}
          className="w-full h-full object-cover"
        />
        {isFavorite && (
          <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
            ⭐
          </span>
        )}
        {isVoted && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              ✓ {t("voted")}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-gray-900 truncate">{dish.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-500">
            {voteCount} {t("votes")}
          </span>
          {showVoteButton && (
            <button
              onClick={isVoted ? onUnvote : onVote}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isVoted
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-orange-500 text-white hover:bg-orange-600"
              }`}
            >
              {isVoted ? "−" : "+"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
