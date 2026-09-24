import "server-only";
import { revalidatePath } from "next/cache";

// ponytail: revalidates every page. Fine for a small blog; switch to per-note cache tags if rebuilds get slow (tech debt #7).
export function revalidatePublicPages() {
  revalidatePath("/", "layout");
}
