import type { MetadataRoute } from "next";
import { container } from "@/lib/container";

export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = container.config();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/login"] },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
