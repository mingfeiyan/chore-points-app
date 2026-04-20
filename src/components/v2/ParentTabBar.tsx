"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BookOpen, Calendar, Gift, Settings } from "lucide-react";
import LogRewardModal from "@/components/rewards/LogRewardModal";

const tabs = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Ledger", href: "/ledger", icon: BookOpen },
  { label: "Reward", href: "__reward__", icon: Gift },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function ParentTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showReward, setShowReward] = useState(false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-pg-line bg-pg-cream"
        style={{
          height: "68px",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;

          if (tab.href === "__reward__") {
            return (
              <button
                key={tab.href}
                onClick={() => setShowReward(true)}
                className="flex flex-col items-center justify-center gap-0.5 text-pg-muted"
              >
                <Icon size={22} />
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    fontFamily: "var(--font-inter)",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 ${
                isActive ? "text-pg-accent" : "text-pg-muted"
              }`}
            >
              <Icon size={22} />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  fontFamily: "var(--font-inter)",
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {showReward && (
        <LogRewardModal
          onClose={() => setShowReward(false)}
          onSuccess={() => {
            setShowReward(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
