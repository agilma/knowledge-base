import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SessionProvider } from "next-auth/react";
import { getSession } from "@/lib/auth/session";
import { CacheGuard } from "@/components/layout/CacheGuard";
import { cacheOwner } from "@/lib/cache-owner";

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Knowledge Base",
  description: "Catatan masalah, solusi, dan konteks project",
  manifest: "/manifest.webmanifest",
  icons: {
    // Listing `apple` alone silently disabled Next's file-based icon
    // convention, so the app shipped without a favicon at all. Name both.
    icon: "/icons/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KB",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Handing the session to the provider saves the client a /api/auth/session
  // round trip (and two more queries) on every page load.
  const session = await getSession();

  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} antialiased font-sans flex h-screen bg-background text-foreground selection:bg-primary/10`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider
            session={session}
            // The session is already handed down from the server, and every
            // refetch costs two queries in Singapore. Server-side checks still
            // run on each request, so the client does not need to re-poll.
            refetchOnWindowFocus={false}
          >
            <CacheGuard owner={cacheOwner(session?.user)} />
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <OfflineIndicator />
              <MobileNav />
              <main className="flex-1 overflow-y-auto w-full">
                {children}
              </main>
            </div>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
