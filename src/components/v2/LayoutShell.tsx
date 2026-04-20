"use client";

import { useNewDesign } from "@/hooks/useNewDesign";
import NavBar from "@/components/NavBar";
import KidModeBanner from "@/components/KidModeBanner";
import MobileNav from "@/components/MobileNav";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { isNewDesign } = useNewDesign();

  if (isNewDesign) {
    return <main className="min-h-screen">{children}</main>;
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
