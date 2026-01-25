import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { PWARegister } from "./components/PWARegister";
import { ConditionalLayout } from "./components/ConditionalLayout";

export const metadata: Metadata = {
  title: "Football Analytics Dashboard",
  description: "Professional full-stack football analytics platform for coaches, scouts and analysts.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Football Analytics",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="antialiased bg-bg text-text">
        <ThemeProvider>
          <I18nProvider>
            <PWARegister />
            <ConditionalLayout>{children}</ConditionalLayout>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
