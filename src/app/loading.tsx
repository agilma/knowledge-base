export default function Loading() {
  return (
    <div
      className="max-w-4xl mx-auto px-6 py-10 space-y-6 animate-pulse"
      role="status"
      aria-label="Memuat"
    >
      <div className="h-8 w-2/3 rounded-md bg-muted" />
      <div className="h-4 w-full rounded-md bg-muted" />
      <div className="h-4 w-5/6 rounded-md bg-muted" />
      <div className="h-4 w-4/6 rounded-md bg-muted" />
    </div>
  );
}
