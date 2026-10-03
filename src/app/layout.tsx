import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { container } from "@/lib/container";
import { SITE_DESCRIPTION as DESCRIPTION, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

// Mobile browser chrome matches the page background (globals.css --background).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
};

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(container.config().siteUrl),
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
    description: DESCRIPTION,
    openGraph: { type: "website", siteName: SITE_NAME, title: SITE_NAME, description: DESCRIPTION },
    twitter: { card: "summary" },
    alternates: { types: { "application/rss+xml": "/rss.xml" } },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("font-sans", geist.variable, geistMono.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
