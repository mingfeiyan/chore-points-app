"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

type PhotoProvider = "NONE" | "VERCEL_BLOB" | "GOOGLE_DRIVE";

interface FamilyPhotoState {
  photoProvider: PhotoProvider;
  googleDriveFolderId: string | null;
  googleDriveConnectedAt: string | null;
}

export default function PhotoStorageCard() {
  const t = useTranslations("settings.photoStorage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<FamilyPhotoState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/family");
    const data = await res.json();
    if (res.ok && data.family) {
      setState({
        photoProvider: data.family.photoProvider,
        googleDriveFolderId: data.family.googleDriveFolderId,
        googleDriveConnectedAt: data.family.googleDriveConnectedAt,
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Returning from Google re-consent lands us back with ?pendingDrive=1;
  // finish the connect call the user kicked off before reauthorizing.
  useEffect(() => {
    if (searchParams.get("pendingDrive") === "1") {
      handleConnect(true);
      router.replace("/settings");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async (fromReauthorize = false) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/drive/connect", { method: "POST" });
      const data = await res.json();
      if (res.status === 409 && data.needsReauthorize) {
        if (fromReauthorize) {
          setError(t("reauthorizeFailed"));
          setBusy(false);
          return;
        }
        await signIn("google", { callbackUrl: "/settings?pendingDrive=1" });
        return;
      }
      if (!res.ok) {
        setError(data.error || t("connectFailed"));
        setBusy(false);
        return;
      }
      await load();
    } catch {
      setError(t("connectFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/drive/disconnect", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("disconnectFailed"));
        return;
      }
      await load();
    } catch {
      setError(t("disconnectFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <div className="bg-white rounded-[14px] border border-[rgba(68,55,32,0.14)] p-5">
        <div className="h-5 w-40 bg-pg-cream rounded animate-pulse" />
      </div>
    );
  }

  const isDrive = state.photoProvider === "GOOGLE_DRIVE";
  const isBlob = state.photoProvider === "VERCEL_BLOB";
  const isNone = state.photoProvider === "NONE";

  return (
    <div className="bg-white rounded-[14px] border border-[rgba(68,55,32,0.14)] p-5">
      <h2 className="text-base font-semibold text-pg-ink mb-1">{t("title")}</h2>
      <p className="text-sm text-pg-muted mb-4">{t("description")}</p>

      <div className="rounded-xl border border-[rgba(68,55,32,0.08)] p-4 mb-4 bg-pg-cream">
        <div className="text-xs font-medium text-pg-muted uppercase tracking-wide mb-1">
          {t("currentLabel")}
        </div>
        <div className="font-semibold text-pg-ink">
          {isDrive && t("providerDrive")}
          {isBlob && t("providerBlob")}
          {isNone && t("providerNone")}
        </div>
        {isDrive && state.googleDriveConnectedAt && (
          <div className="text-xs text-pg-muted mt-1">
            {t("connectedAt", {
              date: new Date(state.googleDriveConnectedAt).toLocaleDateString(),
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 text-sm text-[#c5543d] bg-[rgba(197,84,61,0.08)] border border-[rgba(197,84,61,0.2)] rounded-lg p-3">
          {error}
        </div>
      )}

      {(isNone || isBlob) && (
        <>
          <button
            type="button"
            onClick={() => handleConnect(false)}
            disabled={busy}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-pg-accent-deep text-white rounded-lg hover:bg-[#3d5a2a] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? t("connecting") : t("connectDrive")}
          </button>
          <p className="text-xs text-pg-muted mt-3">{t("connectHint")}</p>
        </>
      )}

      {isDrive && (
        <>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={busy}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-[rgba(68,55,32,0.14)] text-pg-ink rounded-lg hover:bg-pg-cream transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? t("disconnecting") : t("disconnectDrive")}
          </button>
          <p className="text-xs text-pg-muted mt-3">{t("disconnectHint")}</p>
        </>
      )}
    </div>
  );
}
