"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKidMode } from "@/components/providers/KidModeProvider";
import KidRewardsView from "@/components/rewards/KidRewardsView";
import RedeemHeader from "@/components/rewards/RedeemHeader";

export default function ViewAsRedeemClient() {
  const { viewingAsKid, isKidMode } = useKidMode();
  const router = useRouter();

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
        <RedeemHeader />

        <div className="mt-8">
          <KidRewardsView kidId={viewingAsKid.id} readOnly />
        </div>
      </div>
    </div>
  );
}
