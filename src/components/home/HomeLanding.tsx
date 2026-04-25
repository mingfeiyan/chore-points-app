"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ListChecks,
  BookOpen,
  Salad,
  Calendar as CalendarIcon,
  Gift,
  Camera,
  ClipboardList,
  Gem,
  PartyPopper,
  Star,
  Flame,
  Check,
} from "lucide-react";
import Coin from "@/components/v2/Coin";
import CoinSmall from "@/components/v2/CoinSmall";

export default function HomeLanding() {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");

  const features = [
    { title: t("featureChoresTitle"), desc: t("featureChoresDesc"), Icon: ListChecks, bg: "var(--ca-tile-teal)", color: "var(--ca-cobalt-deep)" },
    { title: t("featureLearnTitle"), desc: t("featureLearnDesc"), Icon: BookOpen, bg: "var(--ca-tile-lavender)", color: "#5b3fb8" },
    { title: t("featureMealsTitle"), desc: t("featureMealsDesc"), Icon: Salad, bg: "var(--ca-tile-mint)", color: "#1f7a4a" },
    { title: t("featureCalendarTitle"), desc: t("featureCalendarDesc"), Icon: CalendarIcon, bg: "var(--ca-tile-peach)", color: "#a05a1f" },
    { title: t("featureRewardsTitle"), desc: t("featureRewardsDesc"), Icon: Gift, bg: "var(--ca-tile-pink)", color: "#a8246b" },
    { title: t("featureGalleryTitle"), desc: t("featureGalleryDesc"), Icon: Camera, bg: "var(--ca-tile-butter)", color: "var(--ca-gold-deep)" },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--ca-cream)",
        color: "var(--ca-ink)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          background: "rgba(255,254,249,0.9)",
          borderBottom: "1px solid var(--ca-divider)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <CoinSmall size={28} />
            <span
              className="text-xl font-extrabold"
              style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
            >
              {tNav("appName")}
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/login"
              className="text-sm sm:text-base font-semibold transition-colors"
              style={{ color: "var(--ca-muted)" }}
            >
              {t("signIn")}
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-sm sm:text-base font-extrabold rounded-full transition-transform hover:scale-[1.03]"
              style={{
                background: "linear-gradient(180deg, var(--ca-gold) 0%, #e5ad0a 100%)",
                color: "var(--ca-ink)",
                boxShadow: "0 4px 0 var(--ca-gold-deep), 0 8px 18px rgba(178,123,0,0.25)",
                fontFamily: "var(--font-baloo-2), sans-serif",
              }}
            >
              {t("getStarted")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-60"
          style={{ background: "radial-gradient(circle, var(--ca-gold-glow), transparent 70%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, var(--ca-sky), transparent 70%)" }}
        />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold mb-6"
                style={{
                  background: "rgba(47,98,245,0.1)",
                  color: "var(--ca-cobalt-deep)",
                  fontFamily: "var(--font-nunito), sans-serif",
                }}
              >
                <CoinSmall size={16} />
                {t("tagline")}
              </span>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] mb-6"
                style={{
                  fontFamily: "var(--font-baloo-2), sans-serif",
                  color: "var(--ca-ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                {t("heroTitle")}
              </h1>
              <p
                className="text-lg sm:text-xl leading-relaxed mb-8 max-w-xl"
                style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
              >
                {t("heroSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-extrabold rounded-full transition-transform hover:scale-[1.03]"
                  style={{
                    background: "linear-gradient(180deg, var(--ca-gold) 0%, #e5ad0a 100%)",
                    color: "var(--ca-ink)",
                    boxShadow: "0 6px 0 var(--ca-gold-deep), 0 12px 24px rgba(178,123,0,0.3)",
                    fontFamily: "var(--font-baloo-2), sans-serif",
                  }}
                >
                  {t("getStarted")}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full transition-colors"
                  style={{
                    background: "white",
                    color: "var(--ca-cobalt-deep)",
                    border: "2px solid var(--ca-cobalt)",
                    fontFamily: "var(--font-baloo-2), sans-serif",
                  }}
                >
                  {t("signIn")}
                </Link>
              </div>
            </div>
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="relative">
                <div
                  className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-[22rem] lg:h-[22rem] rounded-[36px] flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(160deg, var(--ca-cobalt) 0%, var(--ca-cobalt-deep) 70%, #0d2480 100%)",
                    boxShadow: "0 20px 60px rgba(26,63,179,0.35)",
                  }}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <Coin size={160} spin />
                    </div>
                    <div
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.15)",
                        color: "white",
                        fontFamily: "var(--font-baloo-2), sans-serif",
                        fontWeight: 800,
                      }}
                    >
                      <CoinSmall size={18} />
                      <span>×128 ·&nbsp;</span>
                      <Flame size={14} className="text-[#ffb14d]" />
                      <span>7 day streak</span>
                    </div>
                  </div>
                </div>
                <div
                  className="absolute -top-5 -right-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-extrabold rotate-6"
                  style={{
                    background: "var(--ca-tile-peach)",
                    color: "var(--ca-ink)",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
                    fontFamily: "var(--font-baloo-2), sans-serif",
                  }}
                >
                  <Star size={16} className="text-[var(--ca-gold-deep)]" fill="currentColor" />
                  Chores done!
                </div>
                <div
                  className="absolute -bottom-5 -left-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-extrabold -rotate-6"
                  style={{
                    background: "var(--ca-tile-mint)",
                    color: "var(--ca-ink)",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
                    fontFamily: "var(--font-baloo-2), sans-serif",
                  }}
                >
                  <BookOpen size={16} className="text-[#1f7a4a]" />
                  Math +5
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-24 px-6" style={{ background: "white" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-4xl font-extrabold mb-4"
              style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
            >
              {t("howItWorks")}
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
            >
              {t("howItWorksSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { n: 1, title: t("step1Title"), desc: t("step1Desc"), bg: "var(--ca-tile-teal)", Icon: ClipboardList, color: "var(--ca-cobalt-deep)" },
              { n: 2, title: t("step2Title"), desc: t("step2Desc"), bg: "var(--ca-tile-butter)", Icon: Gem, color: "var(--ca-gold-deep)" },
              { n: 3, title: t("step3Title"), desc: t("step3Desc"), bg: "var(--ca-tile-pink)", Icon: PartyPopper, color: "#a8246b" },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div
                  className="relative w-24 h-24 mx-auto mb-6 rounded-[24px] flex items-center justify-center"
                  style={{ background: step.bg }}
                >
                  <step.Icon size={48} style={{ color: step.color }} strokeWidth={1.75} />
                  <span
                    className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold"
                    style={{
                      background: "var(--ca-ink)",
                      color: "var(--ca-gold)",
                      fontFamily: "var(--font-baloo-2), sans-serif",
                    }}
                  >
                    {step.n}
                  </span>
                </div>
                <h3
                  className="text-xl font-extrabold mb-3"
                  style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="leading-relaxed"
                  style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 sm:py-24 px-6" style={{ background: "var(--ca-cream)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl font-extrabold mb-4"
              style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
            >
              {t("featuresTitle")}
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
            >
              {t("featuresSubtitle")}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl p-6 transition-transform hover:-translate-y-1"
                style={{
                  background: "white",
                  border: "1px solid var(--ca-divider)",
                  boxShadow: "0 2px 0 rgba(0,0,0,0.03)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: f.bg }}
                >
                  <f.Icon size={28} style={{ color: f.color }} strokeWidth={1.75} />
                </div>
                <h3
                  className="text-lg font-extrabold mb-2"
                  style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
                >
                  {f.title}
                </h3>
                <p
                  className="leading-relaxed text-sm"
                  style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits + dashboard preview */}
      <section className="py-20 sm:py-24 px-6" style={{ background: "white" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-extrabold mb-6 leading-tight"
                style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
              >
                {t("benefitsTitle")}
              </h2>
              <p
                className="text-lg leading-relaxed mb-6"
                style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
              >
                {t("benefitsDesc")}
              </p>
              <ul className="space-y-4">
                {[t("benefit1"), t("benefit2"), t("benefit3")].map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                      style={{
                        background: "var(--ca-gold)",
                        color: "var(--ca-ink)",
                      }}
                    >
                      <Check size={16} strokeWidth={3} />
                    </span>
                    <span
                      className="text-base"
                      style={{ color: "var(--ca-ink)", fontFamily: "var(--font-nunito), sans-serif" }}
                    >
                      {b}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <div
                className="w-full max-w-md rounded-[28px] p-6"
                style={{
                  background: "var(--ca-paper)",
                  border: "1px solid var(--ca-divider)",
                  boxShadow: "0 12px 40px rgba(26,24,19,0.06)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="text-sm font-extrabold"
                    style={{ color: "var(--ca-muted)", fontFamily: "var(--font-baloo-2), sans-serif" }}
                  >
                    This week
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(56,192,127,0.15)",
                      color: "#1f7a4a",
                      fontFamily: "var(--font-nunito), sans-serif",
                      fontWeight: 800,
                      fontSize: 12,
                    }}
                  >
                    <Flame size={12} />
                    7-day streak
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-2xl p-4" style={{ background: "var(--ca-tile-teal)" }}>
                    <div className="text-xs font-bold mb-1" style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}>Chores</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}>12</span>
                      <span className="text-xs" style={{ color: "var(--ca-muted)" }}>done</span>
                    </div>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: "var(--ca-tile-lavender)" }}>
                    <div className="text-xs font-bold mb-1" style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}>Math</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}>48</span>
                      <span className="text-xs" style={{ color: "var(--ca-muted)" }}>correct</span>
                    </div>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: "var(--ca-tile-peach)" }}>
                    <div className="text-xs font-bold mb-1" style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}>Meals planned</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}>5</span>
                      <span className="text-xs" style={{ color: "var(--ca-muted)" }}>this week</span>
                    </div>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: "var(--ca-tile-pink)" }}>
                    <div className="text-xs font-bold mb-1" style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}>Rewards ready</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}>2</span>
                      <span className="text-xs" style={{ color: "var(--ca-muted)" }}>to redeem</span>
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between rounded-2xl p-4"
                  style={{
                    background: "linear-gradient(160deg, var(--ca-cobalt) 0%, var(--ca-cobalt-deep) 100%)",
                    color: "white",
                  }}
                >
                  <div>
                    <div className="text-xs font-bold opacity-80" style={{ fontFamily: "var(--font-nunito), sans-serif" }}>Total gems</div>
                    <div className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-baloo-2), sans-serif", letterSpacing: "-1px" }}>×312</div>
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
        style={{
          background: "linear-gradient(160deg, var(--ca-gold-glow) 0%, var(--ca-tile-peach) 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex mb-6">
            <Coin size={72} />
          </div>
          <h2
            className="text-3xl sm:text-4xl font-extrabold mb-4"
            style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
          >
            {t("ctaTitle")}
          </h2>
          <p
            className="text-lg mb-8"
            style={{ color: "var(--ca-ink)", opacity: 0.75, fontFamily: "var(--font-nunito), sans-serif" }}
          >
            {t("ctaSubtitle")}
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 text-lg font-extrabold rounded-full transition-transform hover:scale-[1.03]"
            style={{
              background: "var(--ca-ink)",
              color: "var(--ca-gold)",
              boxShadow: "0 6px 0 #000, 0 12px 24px rgba(0,0,0,0.2)",
              fontFamily: "var(--font-baloo-2), sans-serif",
            }}
          >
            {t("getStarted")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-10 px-6"
        style={{ background: "var(--ca-cream)", borderTop: "1px solid var(--ca-divider)" }}
      >
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <CoinSmall size={22} />
            <span
              className="text-lg font-extrabold"
              style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
            >
              {tNav("appName")}
            </span>
          </div>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            {t("footerTagline")}
          </p>
          <div
            className="flex items-center justify-center gap-5 text-sm font-bold"
            style={{ color: "var(--ca-cobalt-deep)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            <Link href="/privacy">{t("footerPrivacy")}</Link>
            <span style={{ color: "var(--ca-muted)" }}>·</span>
            <Link href="/terms">{t("footerTerms")}</Link>
          </div>
          <p
            className="mt-3 text-xs"
            style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            {t("footerCopyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
