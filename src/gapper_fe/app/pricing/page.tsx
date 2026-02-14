import Link from "next/link";
import { GapperLogo } from "@/components/branding/GapperLogo";

export default function PricingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6">
      <header className="terminal-shell mb-4 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <GapperLogo markClassName="h-7 w-7" showWordmark={false} />
          <div>
          <h1 className="text-lg font-semibold">Gapper AI Pricing</h1>
          <p className="text-sm text-muted">Static placeholder for plan packaging.</p>
          </div>
        </div>
        <Link href="/terminal" className="rounded-md border border-border/80 bg-panel-soft/45 px-3 py-2 text-sm">
          Back to Terminal
        </Link>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { name: "Starter", price: "$19", feature: "Mock-only workflows" },
          { name: "Pro", price: "$79", feature: "Live connectors + alerts" },
          { name: "Desk", price: "Custom", feature: "Team workspaces" }
        ].map((plan) => (
          <article key={plan.name} className="glass-panel p-4">
            <p className="section-title">{plan.name}</p>
            <p className="mt-2 text-2xl font-semibold">{plan.price}</p>
            <p className="mt-2 text-sm text-muted">{plan.feature}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
