import type { NextRequest } from "next/server";
import { guardAdminRoute } from "@/infrastructure/auth/proxy-session";

export function proxy(request: NextRequest) {
  return guardAdminRoute(request);
}

export const config = { matcher: ["/admin/:path*"] };
