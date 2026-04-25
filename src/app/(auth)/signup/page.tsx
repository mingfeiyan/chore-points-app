"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Coin from "@/components/v2/Coin";
import GoogleLogo from "@/components/v2/GoogleLogo";
import AgreeNotice from "@/components/v2/AgreeNotice";

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

  if (mode === "choose") {
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
            <p className="mt-2 text-sm text-pg-muted">{t("howSignUp")}</p>
          </div>

          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
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

            <button
              onClick={() => setMode("parent")}
              className="w-full flex items-center gap-4 p-5 rounded-[14px] border border-pg-line bg-white text-left transition-colors hover:bg-pg-cream"
            >
              <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-2xl flex-shrink-0 bg-pg-cream border border-pg-line">
                👨‍👩‍👧
              </div>
              <div>
                <div className="font-[family-name:var(--font-fraunces)] text-lg font-medium text-pg-ink">
                  {t("imParent")}
                </div>
                <div className="text-sm mt-0.5 text-pg-muted">{t("createFamily")}</div>
              </div>
            </button>

            <button
              onClick={() => setMode("kid")}
              className="w-full flex items-center gap-4 p-5 rounded-[14px] border border-pg-line bg-white text-left transition-colors hover:bg-pg-cream"
            >
              <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-2xl flex-shrink-0 bg-pg-cream border border-pg-line">
                🧒
              </div>
              <div>
                <div className="font-[family-name:var(--font-fraunces)] text-lg font-medium text-pg-ink">
                  {t("imKid")}
                </div>
                <div className="text-sm mt-0.5 text-pg-muted">{t("joinWithCode")}</div>
              </div>
            </button>
          </div>

          <div className="mt-6">
            <AgreeNotice />
          </div>

          <div className="text-center text-sm mt-3 text-pg-muted">
            <span>{t("alreadyHaveAccount")} </span>
            <Link href="/login" className="font-semibold text-pg-accent-deep hover:underline">
              {t("signIn")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isKid = mode === "kid";

  const inputClass =
    "mt-1 block w-full px-4 py-3 rounded-[10px] border border-pg-line bg-white text-pg-ink text-base focus:outline-none focus:border-pg-accent transition-colors";

  return (
    <div className="min-h-screen bg-pg-cream flex items-center justify-center px-4 py-10 font-[family-name:var(--font-inter)]">
      <div className="w-full max-w-md rounded-[14px] border border-pg-line bg-white p-8 sm:p-10">
        <button
          onClick={() => {
            setMode("choose");
            setError("");
          }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-pg-accent-deep hover:underline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          {tCommon("back")}
        </button>

        <div className="mt-4 text-center">
          <Coin size={48} />
          <h2 className="mt-3 font-[family-name:var(--font-fraunces)] text-2xl font-medium text-pg-ink">
            {isKid ? (
              <>
                Join the <em className="italic text-pg-accent-deep">family</em>
              </>
            ) : (
              <>
                Create your <em className="italic text-pg-accent-deep">family</em>
              </>
            )}
          </h2>
          <p className="mt-1 text-sm text-pg-muted">
            {isKid ? t("joinFamily") : t("createAccount")}
          </p>
        </div>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="px-4 py-3 rounded-[10px] border border-[rgba(197,84,61,0.25)] bg-[rgba(197,84,61,0.08)] text-sm font-medium text-pg-coral">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="inviteCode" className="block text-sm font-semibold text-pg-ink">
              {t("inviteCode")}{" "}
              {isKid && <span className="text-pg-coral">*</span>}
              {!isKid && (
                <span className="ml-1 text-xs font-medium text-pg-muted">(optional)</span>
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
            />
            <p className="mt-1.5 text-xs text-pg-muted">{t("inviteCodeHelper")}</p>
          </div>

          {!isKid && !inviteCode.trim() && (
            <div>
              <label
                htmlFor="registrationSecret"
                className="block text-sm font-semibold text-pg-ink"
              >
                {t("registrationCode")} <span className="text-pg-coral">*</span>
              </label>
              <input
                id="registrationSecret"
                type="password"
                required
                value={registrationSecret}
                onChange={(e) => setRegistrationSecret(e.target.value)}
                placeholder={t("registrationCode")}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-pg-muted">{t("registrationCodeHelper")}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-pg-ink">
              {t("name")}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-pg-ink">
              {t("email")} <span className="text-pg-coral">*</span>
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
              {t("password")} <span className="text-pg-coral">*</span>
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

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-pg-ink"
            >
              {t("confirmPassword")} <span className="text-pg-coral">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 rounded-[10px] text-base font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: "#4a6a32", boxShadow: "0 2px 0 rgba(74,106,50,0.3)" }}
          >
            {loading ? t("creatingAccount") : isKid ? t("joinFamilyButton") : t("signUp")}
          </button>

          <div className="pt-1">
            <AgreeNotice />
          </div>

          <div className="text-center text-sm pt-1 text-pg-muted">
            <span>{t("alreadyHaveAccount")} </span>
            <Link href="/login" className="font-semibold text-pg-accent-deep hover:underline">
              {t("signIn")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
