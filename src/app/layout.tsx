import type { Metadata } from "next";
import { Geist, Geist_Mono, Baloo_2, Nunito, Fraunces, Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import LocaleProvider from "@/components/LocaleProvider";
import KidModeProvider from "@/components/providers/KidModeProvider";
import NewDesignProvider from "@/components/v2/NewDesignProvider";
import LayoutShell from "@/components/v2/LayoutShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baloo2 = Baloo_2({
  variable: "--font-baloo-2",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GemSteps - Build Great Habits",
  description: "Track progress, earn gems, and build lasting habits",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${baloo2.variable} ${nunito.variable} ${fraunces.variable} ${inter.variable} antialiased`}
      >
        <SessionProvider>
          <LocaleProvider>
            <KidModeProvider>
              <NewDesignProvider>
                <LayoutShell>{children}</LayoutShell>
              </NewDesignProvider>
            </KidModeProvider>
          </LocaleProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
