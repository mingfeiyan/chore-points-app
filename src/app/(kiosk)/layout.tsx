// Kiosk route group layout — minimal wrapper with no NavBar/MobileNav.
// KioskView renders as a fixed full-screen overlay (z-50) that covers
// the root layout's NavBar.
export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
