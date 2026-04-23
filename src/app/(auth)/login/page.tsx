"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Coin from "@/components/v2/Coin";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");
  const tHome = useTranslations("home");

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
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
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

          <p
            className="text-center text-xs pt-1"
            style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            {tHome.rich("agreeNotice", {
              terms: (chunks) => (
                <Link
                  href="/terms"
                  className="font-bold"
                  style={{ color: "var(--ca-cobalt-deep)" }}
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href="/privacy"
                  className="font-bold"
                  style={{ color: "var(--ca-cobalt-deep)" }}
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>

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
