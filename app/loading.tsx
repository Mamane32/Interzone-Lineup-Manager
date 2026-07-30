import LoadingState from "@/components/ui/LoadingState";

export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-24">
      <LoadingState rows={6} />
    </main>
  );
}
