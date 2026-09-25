import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Slide images read these fonts with fs at runtime; make sure they're deployed with the route.
  outputFileTracingIncludes: {
    "/admin/drafts/[postId]/images/[index]": ["./assets/fonts/*.ttf"],
  },
};

export default nextConfig;
