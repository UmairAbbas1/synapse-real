import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Synapse</h1>
      <p className="max-w-md text-center text-sm text-neutral-400">
        Local development stack is running. Chat and admin routes are scaffolded under
        the App Router.
      </p>
      <Link
        className="rounded-md border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900"
        href="/chat"
      >
        Open chat
      </Link>
    </main>
  );
}
