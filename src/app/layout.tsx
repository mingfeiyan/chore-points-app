import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import NavBar from "@/components/NavBar";
import MobileNav from "@/components/MobileNav";
import LocaleProvider from "@/components/LocaleProvider";
import KidModeProvider from "@/components/providers/KidModeProvider";
import KidModeBanner from "@/components/KidModeBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GemSteps - Build Great Habits",
  description: "Track progress, earn gems, and build lasting habits",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <LocaleProvider>
            <KidModeProvider>
              <NavBar />
              <KidModeBanner />
              <main className="pb-20 sm:pb-0">{children}</main>
              <MobileNav />
            </KidModeProvider>
          </LocaleProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
