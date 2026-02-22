"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "@/components/LocaleProvider";
import { useKidMode } from "@/components/providers/KidModeProvider";

export default function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { locale, setLocale } = useLocale();
  const { isKidMode } = useKidMode();
  const [learnDropdownOpen, setLearnDropdownOpen] = useState(false);
  const learnDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (learnDropdownRef.current && !learnDropdownRef.current.contains(event.target as Node)) {
        setLearnDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isLearnActive = pathname === "/sight-words" || pathname.startsWith("/learn/");

  const toggleLanguage = () => {
    setLocale(locale === "en" ? "zh" : "en");
  };

  // Don't show navbar on login/signup pages or homepage (has its own nav)
  if (pathname === "/login" || pathname === "/signup" || pathname === "/") {
    return null;
  }

  // Language toggle button component
  const LanguageToggle = () => (
    <button
      onClick={toggleLanguage}
      className="text-sm px-3 py-2 min-h-[44px] min-w-[44px] rounded border border-gray-600 hover:border-gray-400 transition flex items-center justify-center"
      title={t("language")}
    >
      {locale === "en" ? "中文" : "EN"}
    </button>
  );

  // Show loading state
  if (status === "loading") {
    return (
      <nav className="bg-gray-800 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            {t("appName")}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <div className="text-sm text-gray-400">{t("loading") || "Loading..."}</div>
          </div>
        </div>
      </nav>
    );
  }

  // Don't show user info if not logged in
  if (!session) {
    return (
      <nav className="bg-gray-800 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            {t("appName")}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/login"
              className="text-sm hover:text-gray-300 transition px-3 py-2 min-h-[44px] flex items-center"
            >
              {t("login")}
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2.5 min-h-[44px] rounded-lg transition flex items-center"
            >
              {t("signup")}
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const isParent = session.user.role === "PARENT";

  return (
    <nav className="bg-gray-800 text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold">
            {t("appName")}
          </Link>

          {/* Navigation links */}
          {session.user.familyId && (
            <div className="hidden sm:flex items-center gap-4 text-sm">
              {isParent && isKidMode ? (
                // Kid Mode navigation for parents
                <>
                  <Link
                    href="/view-as/points"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/view-as/points" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("myPoints")}
                  </Link>
                  <Link
                    href="/view-as/learn"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/view-as/learn" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("learn")}
                  </Link>
                  <Link
                    href="/view-as/redeem"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/view-as/redeem" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("redeem")}
                  </Link>
                  <Link
                    href="/view-as/gallery"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/view-as/gallery" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("gallery")}
                  </Link>
                </>
              ) : isParent ? (
                // Normal parent navigation
                <>
                  <Link
                    href="/meals"
                    className={`hover:text-gray-300 transition ${
                      pathname.startsWith("/meals") ? "text-blue-400" : ""
                    }`}
                  >
                    {t("meals")}
                  </Link>
                  <Link
                    href="/chores"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/chores" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("chores")}
                  </Link>
                  <Link
                    href="/ledger"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/ledger" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("pointsNav")}
                  </Link>
                  <Link
                    href="/rewards"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/rewards" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("rewards")}
                  </Link>
                  <Link
                    href="/milestones"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/milestones" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("milestones")}
                  </Link>
                  <Link
                    href="/gallery"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/gallery" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("gallery")}
                  </Link>
                  <Link
                    href="/calendar"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/calendar" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("calendar")}
                  </Link>
                  <div className="relative" ref={learnDropdownRef}>
                    <button
                      onClick={() => setLearnDropdownOpen(!learnDropdownOpen)}
                      className={`hover:text-gray-300 transition flex items-center gap-1 ${
                        isLearnActive ? "text-blue-400" : ""
                      }`}
                    >
                      {t("learn")}
                      <svg
                        className={`w-3 h-3 transition-transform ${learnDropdownOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {learnDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-gray-700 rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                        <Link
                          href="/sight-words"
                          onClick={() => setLearnDropdownOpen(false)}
                          className={`block px-4 py-2 hover:bg-gray-600 transition ${
                            pathname === "/sight-words" ? "text-blue-400" : ""
                          }`}
                        >
                          {t("sightWords")}
                        </Link>
                        <Link
                          href="/learn/progress"
                          onClick={() => setLearnDropdownOpen(false)}
                          className={`block px-4 py-2 hover:bg-gray-600 transition ${
                            pathname === "/learn/progress" ? "text-blue-400" : ""
                          }`}
                        >
                          {t("mathProgress")}
                        </Link>
                        <Link
                          href="/learn/questions"
                          onClick={() => setLearnDropdownOpen(false)}
                          className={`block px-4 py-2 hover:bg-gray-600 transition ${
                            pathname === "/learn/questions" ? "text-blue-400" : ""
                          }`}
                        >
                          {t("scheduleQuestions")}
                        </Link>
                        <Link
                          href="/learn/settings"
                          onClick={() => setLearnDropdownOpen(false)}
                          className={`block px-4 py-2 hover:bg-gray-600 transition ${
                            pathname === "/learn/settings" ? "text-blue-400" : ""
                          }`}
                        >
                          {t("mathSettings")}
                        </Link>
                      </div>
                    )}
                  </div>
                  <Link
                    href="/settings"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/settings" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("settings")}
                  </Link>
                </>
              ) : (
                // Kid navigation
                <>
                  <Link
                    href="/points"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/points" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("myPoints")}
                  </Link>
                  <Link
                    href="/learn"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/learn" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("learn")}
                  </Link>
                  <Link
                    href="/redeem"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/redeem" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("redeem")}
                  </Link>
                  <Link
                    href="/gallery"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/gallery" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("gallery")}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* User info and logout */}
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <div className="text-sm">
            <span className="text-gray-400 hidden sm:inline">{t("loggedInAs")} </span>
            <span className="font-medium">
              {session.user.name || session.user.email}
            </span>
            <span
              className={`ml-2 text-xs px-2 py-0.5 rounded ${
                isParent
                  ? "bg-purple-600 text-purple-100"
                  : "bg-green-600 text-green-100"
              }`}
            >
              {isParent ? t("parent") : t("kid")}
            </span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm bg-red-600 hover:bg-red-700 px-4 py-2.5 min-h-[44px] rounded-lg transition flex items-center"
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </nav>
  );
}
