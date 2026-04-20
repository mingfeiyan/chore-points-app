import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
