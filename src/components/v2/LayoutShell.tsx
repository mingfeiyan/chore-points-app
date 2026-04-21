"use client";

import { useEffect, useRef } from "react";
import { useKidMode } from "@/components/providers/KidModeProvider";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import KidTabBar from "@/components/v2/KidTabBar";
import ParentTabBar from "@/components/v2/ParentTabBar";

function V2KidModeBanner() {
  const { isKidMode, viewingAsKid, exitKidMode } = useKidMode();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isKidPage = pathname.startsWith("/view-as") || pathname.startsWith("/points") || pathname.startsWith("/learn");

  // Clear stale kid mode on mount: parent landing on a parent page with
  // kid mode persisted in localStorage should not see the kid-mode banner.
  const didMountExitRef = useRef(false);
  useEffect(() => {
    if (didMountExitRef.current) return;
    didMountExitRef.current = true;
    if (isKidMode && !isKidPage && session?.user?.role === "PARENT") {
      exitKidMode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-exit kid mode on navigation AWAY from kid pages.
  // Track the previous pathname so we only fire on actual transitions —
  // not on fresh mount (which would race with entering kid mode from the dashboard).
  const prevPathnameRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    // Skip on first mount
    if (prev === null) return;
    const wasKidPage = prev.startsWith("/view-as") || prev.startsWith("/points") || prev.startsWith("/learn");
    if (wasKidPage && !isKidPage && isKidMode && session?.user?.role === "PARENT") {
      exitKidMode();
    }
  }, [pathname, isKidPage, isKidMode, session?.user?.role, exitKidMode]);

  if (!isKidMode || session?.user?.role !== "PARENT") return null;

  if (isKidPage) {
    return (
      <div
        className="sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-2.5 font-[family-name:var(--font-nunito)] text-sm text-white"
        style={{ background: "linear-gradient(90deg, var(--ca-cobalt), var(--ca-cobalt-deep))" }}
      >
        <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-extrabold">
          {(viewingAsKid?.name || "K")[0].toUpperCase()}
        </div>
        <span>
          Viewing as <strong>{viewingAsKid?.name || viewingAsKid?.email || "Kid"}</strong>
        </span>
        <button
          onClick={() => { exitKidMode(); router.push("/dashboard"); }}
          className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors"
        >
          Exit Kid Mode
        </button>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-2.5 font-[family-name:var(--font-inter)] text-sm"
      style={{ background: "linear-gradient(90deg, #f8efd7, #efe3c0)", borderBottom: "1px solid rgba(68,55,32,0.14)" }}>
      <div className="w-5 h-5 rounded-full bg-[#6b8e4e] text-white flex items-center justify-center text-[10px] font-extrabold">
        {(viewingAsKid?.name || "K")[0].toUpperCase()}
      </div>
      <span className="text-[#2f2a1f]">
        Viewing as <strong>{viewingAsKid?.name || viewingAsKid?.email || "Kid"}</strong>
      </span>
      <button
        onClick={() => { exitKidMode(); router.push("/dashboard"); }}
        className="px-3 py-1 rounded-full text-xs font-bold"
        style={{ background: "rgba(107,142,78,0.15)", color: "#4a6a32" }}
      >
        Exit Kid Mode
      </button>
    </div>
  );
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { isKidMode } = useKidMode();
  const pathname = usePathname();

  // Pages whose v2 components render their own tab bar internally
  const v2KidPages = ["/points", "/learn", "/badges"];
  const v2ViewAsPages = ["/view-as/points", "/view-as/learn", "/view-as/gallery"];
  const v2ParentPages = ["/dashboard", "/ledger", "/calendar", "/settings", "/rewards", "/gallery"];

  const isViewAsPage = pathname.startsWith("/view-as");
  const hasOwnKidTabBar =
    v2KidPages.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    v2ViewAsPages.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const hasOwnParentTabBar = v2ParentPages.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const isKid = session?.user?.role === "KID";
  const isParent = session?.user?.role === "PARENT";

  // Show fallback KidTabBar for kid users on pages that don't render their own
  const showKidTabBar = (isKid || isViewAsPage) && !hasOwnKidTabBar;
  // Show fallback ParentTabBar for parent (not in kid mode) on pages without own tab bar
  const showParentTabBar = isParent && !isKidMode && !isViewAsPage && !hasOwnParentTabBar && !hasOwnKidTabBar;

  return (
    <>
      <V2KidModeBanner />
      <main className="min-h-screen">{children}</main>
      {showKidTabBar && <KidTabBar />}
      {showParentTabBar && <ParentTabBar />}
    </>
  );
}
