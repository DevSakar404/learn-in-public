import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { container } from "@/lib/container";
import { SITE_DESCRIPTION as DESCRIPTION, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
