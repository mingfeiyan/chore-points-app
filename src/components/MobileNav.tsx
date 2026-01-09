"use client";

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

  const parentLinks = [
    { href: "/dashboard", label: t("dashboard"), icon: "🏠" },
    { href: "/chores", label: t("chores"), icon: "✅" },
    { href: "/ledger", label: t("pointsNav"), icon: "💎" },
    { href: "/rewards", label: t("rewards"), icon: "🎁" },
    { href: "/milestones", label: t("milestones"), icon: "🌟" },
    { href: "/gallery", label: t("gallery"), icon: "📷" },
  ];

  const kidModeLinks = [
    { href: "/view-as/points", label: t("myPoints"), icon: "💎" },
    { href: "/view-as/redeem", label: t("redeem"), icon: "🎁" },
  ];

  const kidLinks = [
    { href: "/dashboard", label: t("dashboard"), icon: "🏠" },
    { href: "/points", label: t("myPoints"), icon: "💎" },
    { href: "/redeem", label: t("redeem"), icon: "🎁" },
  ];

  // Determine which links to show
  let links = kidLinks;
  if (isParent && isKidMode) {
    links = kidModeLinks;
  } else if (isParent) {
    links = parentLinks;
  }

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-gray-800 text-white border-t border-gray-700 z-50">
      <div className="flex justify-around items-center h-16">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-blue-400 bg-gray-700/50"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span className="text-xl mb-0.5">{link.icon}</span>
              <span className="text-[10px] font-medium truncate max-w-[60px]">
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
