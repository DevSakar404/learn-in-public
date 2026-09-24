-- Local sample data (runs on `supabase db reset`). The admin user is created by `pnpm seed:admin`.
insert into public.topics (name, slug, description) values
  ('LLM Fundamentals', 'llm-fundamentals', 'Tokens, context windows, sampling and how models actually behave.'),
  ('Prompt Engineering', 'prompt-engineering', 'Writing prompts that are reliable, testable and cheap.'),
  ('RAG', 'rag', 'Retrieval-augmented generation: chunking, embeddings, search and evaluation.'),
  ('Agents', 'agents', 'Tool use, agent loops, budgets and guardrails.');

insert into public.notes (title, slug, summary, content_md, topic_id, status, published_at)
select
  'Day 1: What a token really is',
  'day-1-what-a-token-really-is',
  'Tokens are not words. Today I learned how tokenizers split text and why it matters for cost and limits.',
  E'# Day 1: What a token really is\n\nI always assumed **1 token ≈ 1 word**. It is closer to 3–4 characters of English.\n\n## What I tried\n\n```ts\nconst text = "Learning in public";\n// ~4 tokens, not 3 words\n```\n\n## Why it matters\n\n- Pricing is per token, so verbose prompts cost more.\n- Context limits are in tokens, not characters.\n- Code and non-English text often use more tokens.\n\nTomorrow: context windows and what happens when you overflow them.',
  id,
  'published',
  now()
from public.topics where slug = 'llm-fundamentals';
