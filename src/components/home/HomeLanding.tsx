"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import Coin from "@/components/v2/CoinPg";
import CoinSmall from "@/components/v2/CoinSmallPg";

export default function HomeLanding() {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");

  const features = [
    { title: t("featureChoresTitle"), desc: t("featureChoresDesc"), emoji: "🧹" },
    { title: t("featureLearnTitle"), desc: t("featureLearnDesc"), emoji: "📘" },
    { title: t("featureMealsTitle"), desc: t("featureMealsDesc"), emoji: "🥗" },
    { title: t("featureCalendarTitle"), desc: t("featureCalendarDesc"), emoji: "📅" },
    { title: t("featureRewardsTitle"), desc: t("featureRewardsDesc"), emoji: "🎁" },
    { title: t("featureGalleryTitle"), desc: t("featureGalleryDesc"), emoji: "📸" },
  ];

  const primaryBtn: React.CSSProperties = {
    background: "#4a6a32",
    boxShadow: "0 2px 0 rgba(74,106,50,0.3)",
  };

  return (
    <div className="min-h-screen bg-pg-cream text-pg-ink font-[family-name:var(--font-inter)]">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[rgba(249,244,232,0.9)] border-b border-pg-line">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <CoinSmall size={28} />
            <span className="font-[family-name:var(--font-fraunces)] text-xl font-medium text-pg-ink">
              {tNav("appName")}
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link href="/login" className="text-sm sm:text-base font-semibold text-pg-muted hover:text-pg-ink transition-colors">
              {t("signIn")}
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-sm sm:text-base font-semibold rounded-[10px] text-white transition-transform hover:scale-[1.02]"
              style={primaryBtn}
            >
              {t("getStarted")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-6 bg-white border border-pg-line text-pg-accent-deep">
                <CoinSmall size={16} />
                {t("tagline")}
              </span>
              <h1 className="font-[family-name:var(--font-fraunces)] text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.1] mb-6 text-pg-ink tracking-tight">
                {t("heroTitle")}
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed mb-8 max-w-xl text-pg-muted">
                {t("heroSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold rounded-[10px] text-white transition-transform hover:scale-[1.02]"
                  style={primaryBtn}
                >
                  {t("getStarted")}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-[10px] bg-white border border-pg-line text-pg-ink hover:bg-pg-cream transition-colors"
                >
                  {t("signIn")}
                </Link>
              </div>
            </div>
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="relative">
                <div
                  className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-[22rem] lg:h-[22rem] rounded-[28px] flex items-center justify-center"
                  style={{
                    background: "linear-gradient(160deg, #6b8e4e 0%, #4a6a32 70%, #2f4622 100%)",
                    boxShadow: "0 12px 40px rgba(74,106,50,0.28)",
                  }}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <Coin size={160} spin />
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(255,255,255,0.18)] text-white font-semibold">
                      <CoinSmall size={18} />
                      <span>×128 · 🔥7 day streak</span>
                    </div>
                  </div>
                </div>
                <div
                  className="absolute -top-5 -right-5 px-4 py-2 rounded-[12px] text-sm font-semibold rotate-6 bg-white border border-pg-line text-pg-ink font-[family-name:var(--font-fraunces)]"
                  style={{ boxShadow: "0 6px 16px rgba(0,0,0,0.06)" }}
                >
                  🌿 Chores done!
                </div>
                <div
                  className="absolute -bottom-5 -left-6 px-4 py-2 rounded-[12px] text-sm font-semibold -rotate-6 bg-white border border-pg-line text-pg-ink font-[family-name:var(--font-fraunces)]"
                  style={{ boxShadow: "0 6px 16px rgba(0,0,0,0.06)" }}
                >
                  📘 Math +5
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-medium mb-4 text-pg-ink">
              {t("howItWorks")}
            </h2>
            <p className="text-lg max-w-2xl mx-auto text-pg-muted">{t("howItWorksSubtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { n: 1, title: t("step1Title"), desc: t("step1Desc"), emoji: "📋" },
              { n: 2, title: t("step2Title"), desc: t("step2Desc"), emoji: "💎" },
              { n: 3, title: t("step3Title"), desc: t("step3Desc"), emoji: "🌱" },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6 rounded-[18px] flex items-center justify-center bg-pg-cream border border-pg-line">
                  <span className="text-5xl">{step.emoji}</span>
                  <span
                    className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: "#4a6a32" }}
                  >
                    {step.n}
                  </span>
                </div>
                <h3 className="font-[family-name:var(--font-fraunces)] text-xl font-medium mb-3 text-pg-ink">
                  {step.title}
                </h3>
                <p className="leading-relaxed text-pg-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 sm:py-24 px-6 bg-pg-cream">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-medium mb-4 text-pg-ink">
              {t("featuresTitle")}
            </h2>
            <p className="text-lg max-w-2xl mx-auto text-pg-muted">{t("featuresSubtitle")}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-[14px] p-6 bg-white border border-pg-line transition-transform hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-[12px] flex items-center justify-center mb-4 text-3xl bg-pg-cream border border-pg-line">
                  {f.emoji}
                </div>
                <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-medium mb-2 text-pg-ink">
                  {f.title}
                </h3>
                <p className="leading-relaxed text-sm text-pg-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits + dashboard preview */}
      <section className="py-20 sm:py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-medium mb-6 leading-tight text-pg-ink">
                {t("benefitsTitle")}
              </h2>
              <p className="text-lg leading-relaxed mb-6 text-pg-muted">{t("benefitsDesc")}</p>
              <ul className="space-y-4">
                {[t("benefit1"), t("benefit2"), t("benefit3")].map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white mt-0.5"
                      style={{ background: "#6b8e4e" }}
                    >
                      ✓
                    </span>
                    <span className="text-base text-pg-ink">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md rounded-[14px] p-6 bg-pg-cream border border-pg-line">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-pg-muted">
                    This week
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-pg-accent-deep bg-white border border-pg-line">
                    🔥 7-day streak
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "Chores", value: 12, suffix: "done" },
                    { label: "Math", value: 48, suffix: "correct" },
                    { label: "Meals planned", value: 5, suffix: "this week" },
                    { label: "Rewards ready", value: 2, suffix: "to redeem" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-[12px] p-4 bg-white border border-pg-line">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-pg-muted mb-1">
                        {s.label}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-ink">
                          {s.value}
                        </span>
                        <span className="text-xs text-pg-muted">{s.suffix}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="flex items-center justify-between rounded-[12px] p-4 text-white"
                  style={{ background: "linear-gradient(160deg, #6b8e4e 0%, #4a6a32 100%)" }}
                >
                  <div>
                    <div className="text-xs font-semibold opacity-80">Total gems</div>
                    <div className="font-[family-name:var(--font-fraunces)] text-3xl font-medium tracking-tight">
                      ×312
                    </div>
                  </div>
                  <Coin size={56} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 sm:py-24 px-6"
        style={{ background: "linear-gradient(160deg, #e9efd9 0%, #f9f4e8 100%)" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex mb-6">
            <Coin size={64} />
          </div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-medium mb-4 text-pg-ink">
            {t("ctaTitle")}
          </h2>
          <p className="text-lg mb-8 text-pg-muted">{t("ctaSubtitle")}</p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-10 py-3.5 text-base font-semibold rounded-[10px] text-white transition-transform hover:scale-[1.02]"
            style={primaryBtn}
          >
            {t("getStarted")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-pg-cream border-t border-pg-line">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <CoinSmall size={22} />
            <span className="font-[family-name:var(--font-fraunces)] text-lg font-medium text-pg-ink">
              {tNav("appName")}
            </span>
          </div>
          <p className="text-sm mb-4 text-pg-muted">{t("footerTagline")}</p>
          <div className="flex items-center justify-center gap-5 text-sm font-semibold text-pg-accent-deep">
            <Link href="/privacy" className="hover:underline">
              {t("footerPrivacy")}
            </Link>
            <span className="text-pg-muted">·</span>
            <Link href="/terms" className="hover:underline">
              {t("footerTerms")}
            </Link>
          </div>
          <p className="mt-3 text-xs text-pg-muted">
            {t("footerCopyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
