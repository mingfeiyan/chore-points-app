"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

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

  // Choose mode screen
  if (mode === "choose") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div>
            <h2 className="text-center text-3xl font-bold text-gray-900">
              {tNav("appName")}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t("howSignUp")}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {/* Google Sign-Up for Parents */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t("orContinueWith")}</span>
              </div>
            </div>

            <button
              onClick={() => setMode("parent")}
              className="w-full flex flex-col items-center p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <svg
                className="w-12 h-12 text-blue-600 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-lg font-medium text-gray-900">
                {t("imParent")}
              </span>
              <span className="text-sm text-gray-500 mt-1">
                {t("createFamily")}
              </span>
            </button>

            <button
              onClick={() => setMode("kid")}
              className="w-full flex flex-col items-center p-6 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <svg
                className="w-12 h-12 text-green-600 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-lg font-medium text-gray-900">
                {t("imKid")}
              </span>
              <span className="text-sm text-gray-500 mt-1">
                {t("joinWithCode")}
              </span>
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">{t("alreadyHaveAccount")} </span>
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              {t("signIn")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Parent or Kid signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <button
            onClick={() => {
              setMode("choose");
              setError("");
            }}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {tCommon("back")}
          </button>
          <h2 className="mt-4 text-center text-3xl font-bold text-gray-900">
            {mode === "parent" ? t("parentSignUp") : t("kidSignUp")}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {mode === "parent"
              ? t("createAccount")
              : t("joinFamily")}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Invite code field - required for kids, optional for parents */}
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
                {t("inviteCode")} {mode === "kid" && <span className="text-red-500">*</span>}
                {mode === "parent" && <span className="text-gray-400 text-xs ml-1">(optional)</span>}
              </label>
              <input
                id="inviteCode"
                type="text"
                required={mode === "kid"}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder={t("inviteCodeHelper")}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none font-mono ${
                  mode === "kid"
                    ? "focus:ring-green-500 focus:border-green-500"
                    : "focus:ring-blue-500 focus:border-blue-500"
                }`}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t("inviteCodeHelper")}
              </p>
            </div>

            {/* Registration code - only for parents without invite code */}
            {mode === "parent" && !inviteCode.trim() && (
              <div>
                <label htmlFor="registrationSecret" className="block text-sm font-medium text-gray-700">
                  {t("registrationCode")} <span className="text-red-500">*</span>
                </label>
                <input
                  id="registrationSecret"
                  type="password"
                  required
                  value={registrationSecret}
                  onChange={(e) => setRegistrationSecret(e.target.value)}
                  placeholder={t("registrationCode")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t("registrationCodeHelper")}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {t("name")}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t("email")} <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t("password")} <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t("confirmPassword")} <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === "kid"
                ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            }`}
          >
            {loading
              ? t("creatingAccount")
              : mode === "kid"
              ? t("joinFamilyButton")
              : t("signUp")}
          </button>

          <div className="text-center text-sm">
            <span className="text-gray-600">{t("alreadyHaveAccount")} </span>
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              {t("signIn")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
