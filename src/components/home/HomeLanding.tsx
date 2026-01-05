"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function HomeLanding() {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          {tNav("appName")}
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          {t("tagline")}
        </p>
        <div className="space-x-4">
          <Link
            href="/signup"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("getStarted")}
          </Link>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-white text-blue-600 font-medium rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            {t("signIn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
