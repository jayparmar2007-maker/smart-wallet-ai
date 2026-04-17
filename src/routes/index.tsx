import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, ShieldCheck, BarChart3, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Smarter money, calmer mind" },
      { name: "description", content: "AI-powered personal finance tracking with budgets, insights and gorgeous analytics." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center glow">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold gradient-text font-display">Lumen</span>
        </div>
        <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
      </header>

      <section className="max-w-4xl mx-auto px-6 pt-16 md:pt-28 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60 border border-border text-xs text-muted-foreground mb-6">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI-powered insights for your money
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
          Money clarity,<br />
          <span className="gradient-text">on autopilot.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
          Track every dollar, set smart budgets, and let AI tell you exactly where your savings are hiding.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/auth"><Button size="lg" className="rounded-full px-8 glow">Get started free</Button></Link>
          <Link to="/auth"><Button size="lg" variant="outline" className="rounded-full px-8">Sign in</Button></Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-4">
        {[
          { icon: BarChart3, title: "Beautiful analytics", desc: "Pie, bar and trend charts that update in real-time." },
          { icon: TrendingUp, title: "AI insights", desc: "Spot patterns, get tips, and predict next month's spend." },
          { icon: ShieldCheck, title: "Bank-grade security", desc: "Encrypted, private, and only ever yours." },
        ].map((f) => (
          <div key={f.title} className="glass-card rounded-2xl p-6">
            <f.icon className="h-6 w-6 text-primary mb-4" />
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
