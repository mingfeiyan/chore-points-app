"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import CoinSmall from "@/components/v2/CoinSmall";

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
}

export default function LegalPage({ title, lastUpdated, intro, sections }: LegalPageProps) {
  const tLegal = useTranslations("legal");
  const tNav = useTranslations("nav");

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--ca-cream)",
        color: "var(--ca-ink)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <nav
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          background: "rgba(255,254,249,0.9)",
          borderBottom: "1px solid var(--ca-divider)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <CoinSmall size={26} />
            <span
              className="text-lg font-extrabold"
              style={{ fontFamily: "var(--font-baloo-2), sans-serif" }}
            >
              {tNav("appName")}
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-bold"
            style={{ color: "var(--ca-cobalt-deep)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            <ChevronLeft size={16} />
            {tLegal("backHome")}
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <header className="mb-8">
          <h1
            className="text-4xl sm:text-5xl font-extrabold leading-tight"
            style={{ fontFamily: "var(--font-baloo-2), sans-serif", letterSpacing: "-0.02em" }}
          >
            {title}
          </h1>
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            {lastUpdated}
          </p>
        </header>

        <div
          className="rounded-[20px] p-6 sm:p-8 space-y-6"
          style={{
            background: "white",
            border: "1px solid var(--ca-divider)",
            boxShadow: "0 8px 30px rgba(26,24,19,0.04)",
          }}
        >
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--ca-ink)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            {intro}
          </p>

          {sections.map((section) => (
            <section key={section.title}>
              <h2
                className="text-xl font-extrabold mb-2"
                style={{
                  fontFamily: "var(--font-baloo-2), sans-serif",
                  color: "var(--ca-ink)",
                }}
              >
                {section.title}
              </h2>
              <p
                className="text-base leading-relaxed"
                style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
              >
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <LegalFooter />
      </main>
    </div>
  );
}

function LegalFooter() {
  const tHome = useTranslations("home");
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 text-center">
      <div
        className="flex items-center justify-center gap-5 text-sm font-bold"
        style={{ color: "var(--ca-cobalt-deep)", fontFamily: "var(--font-nunito), sans-serif" }}
      >
        <Link href="/privacy">{tHome("footerPrivacy")}</Link>
        <span style={{ color: "var(--ca-muted)" }}>·</span>
        <Link href="/terms">{tHome("footerTerms")}</Link>
      </div>
      <p
        className="mt-3 text-xs"
        style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
      >
        {tHome("footerCopyright", { year })}
      </p>
    </footer>
  );
}
