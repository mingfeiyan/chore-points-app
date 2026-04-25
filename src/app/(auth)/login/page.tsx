"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Coin from "@/components/v2/Coin";
import GoogleLogo from "@/components/v2/GoogleLogo";
import AgreeNotice from "@/components/v2/AgreeNotice";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError(t("googleSignInFailed"));
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("invalidCredentials"));
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError(t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "mt-1 block w-full px-4 py-3 rounded-[10px] border border-pg-line bg-white text-pg-ink text-base focus:outline-none focus:border-pg-accent transition-colors";

  return (
    <div className="min-h-screen bg-pg-cream flex items-center justify-center px-4 py-10 font-[family-name:var(--font-inter)]">
      <div className="w-full max-w-md rounded-[14px] border border-pg-line bg-white p-8 sm:p-10">
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center">
            <Coin size={56} />
            <span className="mt-3 font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-ink">
              {tNav("appName")}
            </span>
          </Link>
          <p className="mt-2 text-sm text-pg-muted">{t("signInToAccount")}</p>
        </div>

        <div className="mt-8 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-[10px] border border-[rgba(197,84,61,0.25)] bg-[rgba(197,84,61,0.08)] text-sm font-medium text-pg-coral">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-[10px] border border-pg-line bg-white text-sm font-semibold text-pg-ink transition-colors hover:bg-pg-cream disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleLogo />
            {googleLoading ? t("signingIn") : t("continueWithGoogle")}
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-pg-line" />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="bg-white px-3 font-bold uppercase tracking-wide text-pg-muted">
                {t("orContinueWith")}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-pg-ink">
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-pg-ink">
                {t("password")}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-[10px] text-base font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "#4a6a32", boxShadow: "0 2px 0 rgba(74,106,50,0.3)" }}
            >
              {loading ? t("signingIn") : t("signIn")}
            </button>
          </form>

          <div className="pt-1">
            <AgreeNotice />
          </div>

          <div className="text-center text-sm pt-2 text-pg-muted">
            <span>{t("dontHaveAccount")} </span>
            <Link href="/signup" className="font-semibold text-pg-accent-deep hover:underline">
              {t("signUp")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
