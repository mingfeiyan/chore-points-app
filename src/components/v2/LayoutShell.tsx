"use client";

import { useNewDesign } from "@/hooks/useNewDesign";
import { useKidMode } from "@/components/providers/KidModeProvider";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import KidModeBanner from "@/components/KidModeBanner";
import MobileNav from "@/components/MobileNav";
import KidTabBar from "@/components/v2/KidTabBar";
import ParentTabBar from "@/components/v2/ParentTabBar";

function DesignToggleFAB() {
  const { isNewDesign, setNewDesign } = useNewDesign();
  const { data: session } = useSession();

  // Only show for parents, and only when old design is active
  if (isNewDesign || session?.user?.role !== "PARENT") return null;

  return (
    <button
      onClick={() => setNewDesign(true)}
      className="fixed bottom-24 right-4 z-50 sm:hidden flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-white shadow-lg"
      style={{ background: "linear-gradient(135deg, #6b8e4e, #4a6a32)" }}
    >
      ✨ Try New Design
    </button>
  );
}

function V2KidModeBanner() {
  const { isKidMode, viewingAsKid, exitKidMode } = useKidMode();
  const { data: session } = useSession();
  const router = useRouter();

  if (!isKidMode || session?.user?.role !== "PARENT") return null;

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
  const { isNewDesign } = useNewDesign();
  const { data: session } = useSession();
  const { isKidMode } = useKidMode();
  const pathname = usePathname();

  if (isNewDesign) {
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

  return (
    <>
      <NavBar />
      <KidModeBanner />
      <main className="pb-20 sm:pb-0">{children}</main>
      <MobileNav />
      {/* Floating toggle for easy access on mobile */}
      <DesignToggleFAB />
    </>
  );
}
