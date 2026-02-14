import Link from "next/link";
import { GapperLogo } from "@/components/branding/GapperLogo";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <section className="terminal-shell w-full space-y-4 p-5">
        <header className="space-y-3">
          <GapperLogo />
          <h1 className="text-lg font-semibold">Login</h1>
          <p className="text-sm text-muted">Static placeholder auth screen.</p>
        </header>

        <form className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Email</span>
            <input type="email" className="w-full rounded-md border border-border/80 bg-panel-soft/45 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Password</span>
            <input
              type="password"
              className="w-full rounded-md border border-border/80 bg-panel-soft/45 px-3 py-2"
            />
          </label>
          <button
            type="button"
            className="w-full rounded-md border border-border/80 bg-panel-soft/65 px-3 py-2 text-sm font-semibold"
          >
            Sign In
          </button>
        </form>

        <Link href="/terminal" className="block text-center text-sm text-muted hover:text-foreground">
          Continue to terminal
        </Link>
      </section>
    </main>
  );
}
