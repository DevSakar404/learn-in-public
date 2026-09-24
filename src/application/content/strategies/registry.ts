import type { IPlatformContentStrategy } from "@/domain/post/platform-strategy";
import type { Platform } from "@/domain/post/post";
import { InstagramCarouselStrategy } from "./instagram-carousel-strategy";
import { LinkedInStrategy } from "./linkedin-strategy";
import { XStrategy } from "./x-strategy";
import { YouTubeScriptStrategy } from "./youtube-script-strategy";

export class StrategyRegistry {
  private readonly byPlatform = new Map<Platform, IPlatformContentStrategy>();

  constructor(strategies: readonly IPlatformContentStrategy[]) {
    for (const s of strategies) this.byPlatform.set(s.platform, s);
  }

  get(platform: Platform): IPlatformContentStrategy {
    const strategy = this.byPlatform.get(platform);
    if (!strategy) throw new Error(`No content strategy registered for "${platform}"`);
    return strategy;
  }

  platforms(): Platform[] {
    return [...this.byPlatform.keys()];
  }
}

/** Registering a platform = its strategy file + one entry here. */
export const defaultStrategies = (): StrategyRegistry =>
  new StrategyRegistry([
    new XStrategy(),
    new LinkedInStrategy(),
    new InstagramCarouselStrategy(),
    new YouTubeScriptStrategy(),
  ]);
