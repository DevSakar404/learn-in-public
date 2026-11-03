# F12: Page chat · post-MVP

**Goal:** readers ask questions about the page they are reading. They highlight a line of code or any text, click "Ask about this", and a chat sidebar answers with that page as context.

**Stories:** a reader on the lesson 1 playground highlights `greetPrompt.pipe(model)`, asks "what does pipe do here?", and gets a streamed answer about this code. They ask "how is this different from the last lesson?" and the agent reads that note before answering.

**Not in scope:** an authoring agent (Claude Code writes notes and playgrounds), whole-site search (tech debt), saved chat history.

**Files by layer:** domain `learn/page-tutor.ts` (`IPageTutor`, `PageContext`), `learn/lesson-code.ts` (`GREET_CODE` moved out of the component so the server can read it) · application `chat-service.ts` (`ChatService`, `chatSchema`) · infra `ai/langgraph-page-tutor.ts` (`LangGraphPageTutor`, `readRelatedNote` tool) · lib `container.ts` (`public.chat()`, singleton like `learn`) · app `api/chat/route.ts` · components `chat/page-chat.tsx` (panel + `useChat`), `chat/selection-ask.tsx` (the "Ask about this" pop-up) · fakes `test/fakes/fake-page-tutor.ts`

**Packages:** `ai@7`, `@ai-sdk/react@4`, `@ai-sdk/langchain@3`, `langchain@1.6` (brings `@langchain/langgraph`; needs `@langchain/core` ≥ 1.3.1). Type-checked together on 2026-10-28.

## Flow

1. The reader sends a message. `useChat` POSTs `{ slug, kind: "post" | "playground", selection, messages }` to `/api/chat`. **The browser never sends page text.**
2. The route Zod-parses the body, reads the IP, calls `container.public.chat().answer(ip, input, request.signal)` and returns the stream, or a plain-text error with the status below (`useChat` shows the body as the error message).
3. `ChatService`: rate limit → load the published note by slug → for `playground`, load the lesson code (no lesson = not found) → list the other published notes in the same topic (title + slug) → call `IPageTutor`. `PageContext.readRelated(slug)` returns only notes on that list (the guard lives here, so it is tested with fakes).
4. `LangGraphPageTutor`: `createAgent`, `gpt-4o-mini`, 500 max output tokens, 30s timeout, `recursionLimit: 7` (about 3 model calls). The system prompt holds the page markdown (+ code), the selection and the related-note list, and tells the model to stay on the page's topic. One tool, `readRelatedNote(slug)`. The agent stream goes through `@ai-sdk/langchain`'s `toUIMessageStream` into an AI SDK UI message stream.

## Rules

- Shown on every blog post page and every playground page. Not on home or topic lists.
- Page context is loaded on the server, published notes only. The model never sees drafts or other topics.
- Limits (Zod): at most 10 messages per request (the client drops older ones), 1,000 characters per reader message (4,000 per earlier answer sent back as history), 2,000 characters of selection. Only text parts of each message reach the model; tool parts are dropped.
- Public, so rate limited: 10 messages per IP per minute (a new in-memory `RateLimiter`, same caveat as tech debt #12).
- Model is fixed: OpenAI `gpt-4o-mini` via `OPENAI_API_KEY`. Without it the sidebar says chat isn't switched on.
- Nothing is stored: no table, no server-side history. The chat lives for the current page only.
- Only `src/infrastructure/**` imports `langchain` and `@langchain/*` (ESLint).

## UI

- A round toggle button bottom-right opens a plain `<aside>` (not a modal, so readers can keep highlighting). The toggle hides while the panel is open; the panel has its own close button. Desktop (≥1024px): 380px wide, the page shifts left (the public layout's wrapper gets `lg:group-has-[[data-chat-open]]/page:pr-[380px]`, like the existing `data-wide` hook). Smaller screens: full-width overlay. Open/closed is remembered in `localStorage` (read with `useSyncExternalStore` like `slide-images.tsx`, try/catch).
- Selecting text inside `[data-chat-context]` (post body, playground code and flow) shows an "Ask about this" button. Clicking it opens the panel with the selection as a removable quote chip. Keyboard selection works too.
- Panel: header ("Ask about this page", New chat, close), three starter questions when empty, answers rendered with `components/markdown.tsx` (raw HTML off), a "Read note: _slug_" line when the tool runs, textarea (Enter sends, Shift+Enter new line), Send turns into Stop while streaming.
- A11y: `aside aria-label="Ask about this page"`, focus moves to the input on open, Esc closes and returns focus to the toggle, the message list is `aria-live="polite"` with `aria-busy` while streaming, icon buttons have `aria-label`s, light/dark tokens, works at 375px.

## Errors

| Case                                                     | Status | Reader sees                                        |
| -------------------------------------------------------- | ------ | -------------------------------------------------- |
| Bad body                                                 | 400    | "That message is too long."                        |
| Over the rate limit                                      | 429    | "You've asked a lot. Wait a minute and try again." |
| Unknown or unpublished slug, or no lesson for playground | 404    | "Chat isn't available on this page."               |
| No `OPENAI_API_KEY`                                      | 503    | "Chat isn't switched on yet."                      |
| Provider error or timeout mid-stream                     | —      | "Something went wrong" + Retry (`regenerate()`)    |

Mid-stream provider errors go through `ai/error-mapping.ts`; the real text stays in the server log. `toUIMessageStream` puts `error.message` in its error chunk, so `LangGraphPageTutor` pipes the stream through `redactErrors`, which swaps that text for the safe message. Text already streamed stays on screen. A `readRelatedNote` call for a slug not on the list returns "That note isn't available" instead of throwing.

## Done when

- [ ] `ChatService` is unit-tested with `FakePageTutor`: the 11th message in a minute is blocked; unknown slug, draft note and lesson-less playground return not found; related notes are published, same topic and exclude the current note; playground pages include the lesson code; the selection is passed through.
- [ ] `chatSchema` limits, the `readRelated` slug guard, `systemPrompt`, `redactErrors` and the missing-key error are unit-tested.
- [ ] `docs/02-decisions.md` (LangGraph `createAgent` for chat, AI SDK for the UI) and `docs/03-tech-debt.md` (whole-site search, saved history) are updated.
- [ ] Checked locally: highlight a line on the lesson 1 playground, ask, the answer streams; the agent reads a related note when asked.
