export class SlugService {
  slugify(text: string): string {
    const slug = text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/, "");
    return slug || "untitled";
  }

  /** `base`, then `base-2`, `base-3`… until `exists` says it's free. The DB unique constraint still guards races. */
  async unique(text: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
    const base = this.slugify(text);
    let slug = base;
    for (let n = 2; await exists(slug); n++) slug = `${base}-${n}`;
    return slug;
  }
}
