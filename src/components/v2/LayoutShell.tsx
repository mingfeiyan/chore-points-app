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
    // Determine if we need to show a tab bar (for pages that don't render their own)
    const isViewAsPage = pathname.startsWith("/view-as");
    const isKidRoute = pathname.startsWith("/points") || pathname.startsWith("/learn") || pathname.startsWith("/shop") || pathname.startsWith("/profile");
    const isParentRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/ledger") || pathname.startsWith("/calendar") || pathname.startsWith("/settings") || pathname.startsWith("/chores") || pathname.startsWith("/gallery") || pathname.startsWith("/sight-words");

    const showKidTabBar = isViewAsPage || (session?.user?.role === "KID" && !isKidRoute);
    const showParentTabBar = !isKidMode && !isViewAsPage && session?.user?.role === "PARENT" && !isParentRoute && !isKidRoute;

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
    </>
  );
}
