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
    "mt-1 block w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-shadow";
  const inputStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid var(--ca-divider)",
    color: "var(--ca-ink)",
    fontFamily: "var(--font-nunito), sans-serif",
    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.02)",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(ellipse at top, var(--ca-gold-glow) 0%, transparent 55%), var(--ca-cream)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <div
        className="w-full max-w-md rounded-[28px] p-8 sm:p-10"
        style={{
          background: "white",
          border: "1px solid var(--ca-divider)",
          boxShadow: "0 20px 60px rgba(26,24,19,0.08)",
        }}
      >
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center">
            <Coin size={64} />
            <span
              className="mt-3 text-2xl font-extrabold"
              style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
            >
              {tNav("appName")}
            </span>
          </Link>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            {t("signInToAccount")}
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {error && (
            <div
              className="px-4 py-3 rounded-2xl text-sm font-semibold"
              style={{
                background: "rgba(246,105,81,0.1)",
                border: "1px solid rgba(246,105,81,0.25)",
                color: "#b23a25",
                fontFamily: "var(--font-nunito), sans-serif",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "white",
              border: "1.5px solid var(--ca-divider)",
              color: "var(--ca-ink)",
              fontFamily: "var(--font-nunito), sans-serif",
            }}
          >
            <GoogleLogo />
            {googleLoading ? t("signingIn") : t("continueWithGoogle")}
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: "1px solid var(--ca-divider)" }} />
            </div>
            <div className="relative flex justify-center text-xs">
              <span
                className="px-3"
                style={{
                  background: "white",
                  color: "var(--ca-muted)",
                  fontFamily: "var(--font-nunito), sans-serif",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t("orContinueWith")}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold"
                style={{ color: "var(--ca-ink)", fontFamily: "var(--font-nunito), sans-serif" }}
              >
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold"
                style={{ color: "var(--ca-ink)", fontFamily: "var(--font-nunito), sans-serif" }}
              >
                {t("password")}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-2xl text-base font-extrabold transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: "linear-gradient(180deg, var(--ca-gold) 0%, #e5ad0a 100%)",
                color: "var(--ca-ink)",
                boxShadow: "0 5px 0 var(--ca-gold-deep), 0 10px 20px rgba(178,123,0,0.25)",
                fontFamily: "var(--font-baloo-2), sans-serif",
              }}
            >
              {loading ? t("signingIn") : t("signIn")}
            </button>
          </form>

          <div className="pt-1">
            <AgreeNotice />
          </div>

          <div
            className="text-center text-sm pt-2"
            style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            <span>{t("dontHaveAccount")} </span>
            <Link
              href="/signup"
              className="font-extrabold"
              style={{ color: "var(--ca-cobalt-deep)" }}
            >
              {t("signUp")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
