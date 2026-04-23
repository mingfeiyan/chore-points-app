"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Coin from "@/components/v2/Coin";

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "parent" | "kid">("choose");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [registrationSecret, setRegistrationSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tHome = useTranslations("home");

  const renderAgreeNotice = () =>
    tHome.rich("agreeNotice", {
      terms: (chunks) => (
        <Link href="/terms" className="font-bold" style={{ color: "var(--ca-cobalt-deep)" }}>
          {chunks}
        </Link>
      ),
      privacy: (chunks) => (
        <Link href="/privacy" className="font-bold" style={{ color: "var(--ca-cobalt-deep)" }}>
          {chunks}
        </Link>
      ),
    });

  const handleGoogleSignUp = async () => {
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

    if (password !== confirmPassword) {
      setError(t("passwordsMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    if (mode === "kid" && !inviteCode.trim()) {
      setError(t("inviteCodeRequired"));
      return;
    }

    // Parent needs either invite code OR registration secret
    if (mode === "parent" && !inviteCode.trim() && !registrationSecret.trim()) {
      setError(t("codeRequired"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          role: mode === "kid" ? "KID" : "PARENT",
          inviteCode: inviteCode.trim() || undefined,
          registrationSecret: mode === "parent" && !inviteCode.trim() ? registrationSecret.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || tCommon("error"));
        setLoading(false);
        return;
      }

      // Auto sign in after successful signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("accountCreatedSignInFailed"));
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  const pageBg: React.CSSProperties = {
    background:
      "radial-gradient(ellipse at top, var(--ca-gold-glow) 0%, transparent 55%), var(--ca-cream)",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
  };
  const cardStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid var(--ca-divider)",
    boxShadow: "0 20px 60px rgba(26,24,19,0.08)",
  };

  const inputClass =
    "mt-1 block w-full px-4 py-3 rounded-2xl text-base focus:outline-none transition-shadow";
  const inputStyle = (accent: "gold" | "cobalt"): React.CSSProperties => ({
    background: "white",
    border: `1px solid var(--ca-divider)`,
    color: "var(--ca-ink)",
    fontFamily: accent === "cobalt" ? "var(--font-nunito), sans-serif" : "var(--font-nunito), sans-serif",
    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.02)",
  });
  const labelStyle: React.CSSProperties = {
    color: "var(--ca-ink)",
    fontFamily: "var(--font-nunito), sans-serif",
  };

  // Choose mode screen
  if (mode === "choose") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10" style={pageBg}>
        <div className="w-full max-w-md rounded-[28px] p-8 sm:p-10" style={cardStyle}>
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
              {t("howSignUp")}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
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

            <button
              onClick={() => setMode("parent")}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-colors"
              style={{
                background: "var(--ca-tile-teal)",
                border: "1.5px solid transparent",
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: "white" }}
              >
                👨‍👩‍👧
              </div>
              <div>
                <div
                  className="text-base font-extrabold"
                  style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
                >
                  {t("imParent")}
                </div>
                <div
                  className="text-sm mt-0.5"
                  style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
                >
                  {t("createFamily")}
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode("kid")}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-colors"
              style={{
                background: "var(--ca-tile-butter)",
                border: "1.5px solid transparent",
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: "white" }}
              >
                🧒
              </div>
              <div>
                <div
                  className="text-base font-extrabold"
                  style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
                >
                  {t("imKid")}
                </div>
                <div
                  className="text-sm mt-0.5"
                  style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
                >
                  {t("joinWithCode")}
                </div>
              </div>
            </button>
          </div>

          <p
            className="text-center text-xs mt-6"
            style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            {renderAgreeNotice()}
          </p>

          <div
            className="text-center text-sm mt-3"
            style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            <span>{t("alreadyHaveAccount")} </span>
            <Link
              href="/login"
              className="font-extrabold"
              style={{ color: "var(--ca-cobalt-deep)" }}
            >
              {t("signIn")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isKid = mode === "kid";
  const primaryBg = isKid
    ? "linear-gradient(180deg, var(--ca-mint) 0%, #2ca46a 100%)"
    : "linear-gradient(180deg, var(--ca-gold) 0%, #e5ad0a 100%)";
  const primaryShadow = isKid
    ? "0 5px 0 #1f7a4a, 0 10px 20px rgba(31,122,74,0.25)"
    : "0 5px 0 var(--ca-gold-deep), 0 10px 20px rgba(178,123,0,0.25)";
  const primaryTextColor = isKid ? "white" : "var(--ca-ink)";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={pageBg}>
      <div className="w-full max-w-md rounded-[28px] p-8 sm:p-10" style={cardStyle}>
        <button
          onClick={() => {
            setMode("choose");
            setError("");
          }}
          className="inline-flex items-center gap-1.5 text-sm font-bold"
          style={{ color: "var(--ca-cobalt-deep)", fontFamily: "var(--font-nunito), sans-serif" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          {tCommon("back")}
        </button>

        <div className="mt-4 text-center">
          <Coin size={56} />
          <h2
            className="mt-3 text-2xl font-extrabold"
            style={{ fontFamily: "var(--font-baloo-2), sans-serif", color: "var(--ca-ink)" }}
          >
            {isKid ? t("kidSignUp") : t("parentSignUp")}
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            {isKid ? t("joinFamily") : t("createAccount")}
          </p>
        </div>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
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

          <div>
            <label htmlFor="inviteCode" className="block text-sm font-bold" style={labelStyle}>
              {t("inviteCode")}{" "}
              {isKid && <span style={{ color: "var(--ca-coral)" }}>*</span>}
              {!isKid && (
                <span
                  className="ml-1 text-xs"
                  style={{ color: "var(--ca-muted)", fontWeight: 600 }}
                >
                  (optional)
                </span>
              )}
            </label>
            <input
              id="inviteCode"
              type="text"
              required={isKid}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder={t("inviteCodeHelper")}
              className={`${inputClass} font-mono tracking-wider`}
              style={inputStyle(isKid ? "cobalt" : "gold")}
            />
            <p
              className="mt-1.5 text-xs"
              style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
            >
              {t("inviteCodeHelper")}
            </p>
          </div>

          {!isKid && !inviteCode.trim() && (
            <div>
              <label
                htmlFor="registrationSecret"
                className="block text-sm font-bold"
                style={labelStyle}
              >
                {t("registrationCode")} <span style={{ color: "var(--ca-coral)" }}>*</span>
              </label>
              <input
                id="registrationSecret"
                type="password"
                required
                value={registrationSecret}
                onChange={(e) => setRegistrationSecret(e.target.value)}
                placeholder={t("registrationCode")}
                className={inputClass}
                style={inputStyle("gold")}
              />
              <p
                className="mt-1.5 text-xs"
                style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
              >
                {t("registrationCodeHelper")}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-bold" style={labelStyle}>
              {t("name")}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              style={inputStyle("gold")}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold" style={labelStyle}>
              {t("email")} <span style={{ color: "var(--ca-coral)" }}>*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              style={inputStyle("gold")}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold" style={labelStyle}>
              {t("password")} <span style={{ color: "var(--ca-coral)" }}>*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              style={inputStyle("gold")}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-bold"
              style={labelStyle}
            >
              {t("confirmPassword")} <span style={{ color: "var(--ca-coral)" }}>*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              style={inputStyle("gold")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3.5 px-4 rounded-2xl text-base font-extrabold transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: primaryBg,
              color: primaryTextColor,
              boxShadow: primaryShadow,
              fontFamily: "var(--font-baloo-2), sans-serif",
            }}
          >
            {loading ? t("creatingAccount") : isKid ? t("joinFamilyButton") : t("signUp")}
          </button>

          <p
            className="text-center text-xs pt-1"
            style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            {renderAgreeNotice()}
          </p>

          <div
            className="text-center text-sm pt-1"
            style={{ color: "var(--ca-muted)", fontFamily: "var(--font-nunito), sans-serif" }}
          >
            <span>{t("alreadyHaveAccount")} </span>
            <Link
              href="/login"
              className="font-extrabold"
              style={{ color: "var(--ca-cobalt-deep)" }}
            >
              {t("signIn")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
