"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useKidMode } from "@/components/providers/KidModeProvider";

export default function MobileNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { isKidMode } = useKidMode();
  const [showMore, setShowMore] = useState(false);
  const [learnExpanded, setLearnExpanded] = useState(false);

  // Don't show on login/signup pages or if not logged in
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/" ||
    !session?.user?.familyId
  ) {
    return null;
  }

  const isParent = session.user.role === "PARENT";

  // Primary links shown in the bottom bar (4 items max)
  const parentPrimaryLinks = [
    { href: "/meals", label: t("meals"), icon: "🍽️" },
    { href: "/ledger", label: t("pointsNav"), icon: "💎" },
    { href: "/chores", label: t("chores"), icon: "✅" },
    { href: "/rewards", label: t("rewards"), icon: "🎁" },
  ];

  // Secondary links shown in the "More" popup
  const parentSecondaryLinks = [
    { href: "/calendar", label: t("calendar"), icon: "📅" },
    { href: "/gallery", label: t("gallery"), icon: "📷" },
    { href: "/milestones", label: t("milestones"), icon: "🏆" },
    { href: "/settings", label: t("settings"), icon: "⚙️" },
  ];

  // Learn sub-links
  const learnSubLinks = [
    { href: "/sight-words", label: t("sightWords"), icon: "📚" },
    { href: "/learn/questions", label: t("scheduleQuestions"), icon: "✏️" },
    { href: "/learn/progress", label: t("mathProgress"), icon: "📊" },
    { href: "/learn/settings", label: t("mathSettings"), icon: "🔢" },
  ];

  const isLearnActive = pathname === "/sight-words" || pathname.startsWith("/learn/");

  const kidModeLinks = [
    { href: "/view-as/points", label: t("myPoints"), icon: "💎" },
    { href: "/view-as/learn", label: t("learn"), icon: "📚" },
    { href: "/view-as/redeem", label: t("redeem"), icon: "🎁" },
    { href: "/view-as/gallery", label: t("gallery"), icon: "📷" },
  ];

  const kidLinks = [
    { href: "/dashboard", label: t("dashboard"), icon: "🏠" },
    { href: "/points", label: t("myPoints"), icon: "💎" },
    { href: "/learn", label: t("learn"), icon: "📚" },
    { href: "/redeem", label: t("redeem"), icon: "🎁" },
    { href: "/gallery", label: t("gallery"), icon: "📷" },
  ];

  // Determine which links to show
  let primaryLinks = kidLinks;
  let secondaryLinks: typeof parentSecondaryLinks = [];

  if (isParent && isKidMode) {
    primaryLinks = kidModeLinks;
  } else if (isParent) {
    primaryLinks = parentPrimaryLinks;
    secondaryLinks = parentSecondaryLinks;
  }

  // Check if any secondary link is active
  const isSecondaryActive = secondaryLinks.some(link => pathname === link.href) || isLearnActive;

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div
          className="sm:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More menu popup */}
      {showMore && (secondaryLinks.length > 0 || learnSubLinks.length > 0) && (
        <div className="sm:hidden fixed bottom-20 right-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 min-w-[160px]">
          {secondaryLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setShowMore(false)}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isActive
                    ? "text-blue-400 bg-gray-700/50"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            );
          })}

          {/* Learn expandable section */}
          {learnSubLinks.length > 0 && (
            <>
              <button
                onClick={() => setLearnExpanded(!learnExpanded)}
                className={`flex items-center gap-3 px-4 py-3 transition-colors w-full ${
                  isLearnActive
                    ? "text-blue-400 bg-gray-700/50"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                }`}
              >
                <span className="text-lg">📖</span>
                <span className="text-sm font-medium flex-1 text-left">{t("learn")}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${learnExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {learnExpanded && learnSubLinks.map((link) => {
                const isActive = link.href === "/learn/progress"
                  ? pathname.startsWith("/learn/progress")
                  : pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setShowMore(false)}
                    className={`flex items-center gap-3 pl-8 pr-4 py-2 transition-colors ${
                      isActive
                        ? "text-blue-400 bg-gray-700/50"
                        : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                    }`}
                  >
                    <span className="text-base">{link.icon}</span>
                    <span className="text-sm">{link.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </div>
      )}

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-gray-800 text-white border-t border-gray-700 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-[68px]">
          {primaryLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center flex-1 h-full min-h-[68px] transition-colors ${
                  isActive
                    ? "text-blue-400 bg-gray-700/50"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="text-2xl mb-1">{link.icon}</span>
                <span className="text-xs font-medium truncate max-w-[70px]">
                  {link.label}
                </span>
              </Link>
            );
          })}

          {/* More button for parent view */}
          {secondaryLinks.length > 0 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[68px] transition-colors ${
                showMore || isSecondaryActive
                  ? "text-blue-400 bg-gray-700/50"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span className="text-2xl mb-1">•••</span>
              <span className="text-xs font-medium">{t("more")}</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
