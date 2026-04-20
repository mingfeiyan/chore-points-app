"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, BookOpen, ShoppingBag, User } from "lucide-react";

const tabs = [
  { label: "Home", href: "/points", icon: Home },
  { label: "Chores", href: "/chores", icon: ListChecks },
  { label: "Learn", href: "/learn", icon: BookOpen },
  { label: "Shop", href: "/shop", icon: ShoppingBag },
  { label: "Profile", href: "/profile", icon: User },
];

export default function KidTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-ca-divider bg-white"
      style={{
        height: "68px",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-0.5 ${
              isActive ? "text-ca-cobalt" : "text-ca-muted"
            }`}
          >
            <Icon size={22} />
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                fontFamily: "var(--font-nunito)",
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
