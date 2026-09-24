export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
