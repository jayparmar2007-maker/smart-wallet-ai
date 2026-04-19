import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { ArrowDownRight, ArrowUpRight, Wallet, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Lumen" }] }),
  component: Dashboard,
});

type Tx = { id: string; amount: number; type: "income" | "expense"; occurred_on: string; category_id: string | null; note: string | null };
type Cat = { id: string; name: string; color: string; type: string };

function Dashboard() {
  const { user, loading } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [profile, setProfile] = useState<{ display_name: string | null; currency: string; monthly_income: number } | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    (async () => {
      const since = format(subMonths(startOfMonth(new Date()), 5), "yyyy-MM-dd");
      const { data: t } = await supabase
        .from("transactions")
        .select("*")
        .gte("occurred_on", since)
        .order("occurred_on", { ascending: false });
      if (cancelled) return;

      const { data: c } = await supabase.from("categories").select("*");
      if (cancelled) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("display_name,currency,monthly_income")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;

      setTxs((t ?? []) as Tx[]);
      setCats((c ?? []) as Cat[]);
      setProfile(p as any);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const currency = profile?.currency ?? "USD";

  const stats = useMemo(() => {
    const now = new Date();
    const s = startOfMonth(now), e = endOfMonth(now);
    const monthTx = txs.filter((t) => {
      const d = new Date(t.occurred_on);
      return d >= s && d <= e;
    });
    const income = monthTx.filter((t) => t.type === "income").reduce((a, b) => a + Number(b.amount), 0);
    const expense = monthTx.filter((t) => t.type === "expense").reduce((a, b) => a + Number(b.amount), 0);
    return { income, expense, balance: income - expense, monthTx };
  }, [txs]);

  const pieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    stats.monthTx.filter((t) => t.type === "expense").forEach((t) => {
      const c = cats.find((x) => x.id === t.category_id);
      const key = c?.name ?? "Other";
      const cur = map.get(key) ?? { name: key, value: 0, color: c?.color ?? "#64748b" };
      cur.value += Number(t.amount);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [stats.monthTx, cats]);

  const monthlyData = useMemo(() => {
    const months: { name: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const s = startOfMonth(d), e = endOfMonth(d);
      const m = txs.filter((t) => { const td = new Date(t.occurred_on); return td >= s && td <= e; });
      months.push({
        name: format(d, "MMM"),
        income: m.filter((t) => t.type === "income").reduce((a, b) => a + Number(b.amount), 0),
        expense: m.filter((t) => t.type === "expense").reduce((a, b) => a + Number(b.amount), 0),
      });
    }
    return months;
  }, [txs]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, number>();
    stats.monthTx.filter((t) => t.type === "expense").forEach((t) => {
      const k = format(new Date(t.occurred_on), "MMM d");
      map.set(k, (map.get(k) ?? 0) + Number(t.amount));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).reverse();
  }, [stats.monthTx]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMM d")}</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">
            Hey {profile?.display_name?.split(" ")[0] ?? "there"} 👋
          </h1>
        </div>
        <Link to="/transactions"><Button className="glow"><Plus className="h-4 w-4 mr-1" /> Add</Button></Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Balance" value={formatMoney(stats.balance, currency)} icon={<Wallet className="h-4 w-4" />} accent />
        <StatCard label="Income" value={formatMoney(stats.income, currency)} icon={<ArrowUpRight className="h-4 w-4 text-success" />} />
        <StatCard label="Expenses" value={formatMoney(stats.expense, currency)} icon={<ArrowDownRight className="h-4 w-4 text-destructive" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="glass-card rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">6-month overview</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.03 250 / 30%)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.68 0.02 250)" fontSize={12} />
                <YAxis stroke="oklch(0.68 0.02 250)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.035 250)", border: "1px solid oklch(0.3 0.03 250)", borderRadius: 12 }} />
                <Bar dataKey="income" fill="oklch(0.82 0.18 165)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" fill="oklch(0.7 0.18 280)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold mb-4">By category</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No expenses yet this month</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.21 0.035 250)", border: "1px solid oklch(0.3 0.03 250)", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Spending trend (this month)</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.03 250 / 30%)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.68 0.02 250)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.02 250)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.035 250)", border: "1px solid oklch(0.3 0.03 250)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="value" stroke="oklch(0.82 0.18 165)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Recent</h3>
          <div className="space-y-3">
            {txs.slice(0, 5).map((t) => {
              const c = cats.find((x) => x.id === t.category_id);
              return (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{c?.name ?? "Uncategorized"}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(t.occurred_on), "MMM d")}</div>
                  </div>
                  <div className={t.type === "income" ? "text-success font-medium" : "font-medium"}>
                    {t.type === "income" ? "+" : "−"}{formatMoney(Number(t.amount), currency)}
                  </div>
                </div>
              );
            })}
            {txs.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet</p>}
          </div>
        </div>
      </div>

      <Link to="/insights" className="mt-6 glass-card rounded-2xl p-5 flex items-center gap-4 hover:border-primary/50 transition-colors block">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center glow shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Get AI insights →</div>
          <div className="text-sm text-muted-foreground">Find hidden savings and personal tips based on your spending.</div>
        </div>
      </Link>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`glass-card rounded-2xl p-5 ${accent ? "ring-1 ring-primary/30" : ""}`}>
      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`mt-2 text-2xl md:text-3xl font-bold font-display ${accent ? "gradient-text" : ""}`}>{value}</div>
    </div>
  );
}
