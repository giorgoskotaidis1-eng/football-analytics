import type { Metadata } from "next";
import "../globals.css";
import { PWARegister } from "../components/PWARegister";

export const metadata: Metadata = {
  title: "Football Analytics - Demo",
  description: "Professional football analytics platform demo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Football Analytics Demo",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#10b981",
};

export default function DemoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="antialiased bg-slate-950 text-slate-50 min-h-screen">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}

