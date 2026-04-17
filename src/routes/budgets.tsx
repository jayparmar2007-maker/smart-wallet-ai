import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/budgets")({
  head: () => ({ meta: [{ title: "Budgets — Lumen" }] }),
  component: BudgetsPage,
});

type Cat = { id: string; name: string; color: string; type: string };
type Budget = { id: string; category_id: string; amount: number; month: string };
type Tx = { amount: number; category_id: string | null; type: string; occurred_on: string };

function BudgetsPage() {
  const { user, loading } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [currency, setCurrency] = useState("USD");
  const monthStr = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const load = async () => {
    const s = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const e = format(endOfMonth(new Date()), "yyyy-MM-dd");
    const [{ data: c }, { data: b }, { data: t }, { data: p }] = await Promise.all([
      supabase.from("categories").select("*").eq("type", "expense"),
      supabase.from("budgets").select("*").eq("month", s),
      supabase.from("transactions").select("amount,category_id,type,occurred_on").eq("type", "expense").gte("occurred_on", s).lte("occurred_on", e),
      supabase.from("profiles").select("currency").eq("user_id", user!.id).maybeSingle(),
    ]);
    setCats((c ?? []) as Cat[]);
    setBudgets((b ?? []) as Budget[]);
    setTxs((t ?? []) as Tx[]);
    setCurrency((p as any)?.currency ?? "USD");
  };
  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  const spent = useMemo(() => {
    const m = new Map<string, number>();
    txs.forEach((t) => { if (t.category_id) m.set(t.category_id, (m.get(t.category_id) ?? 0) + Number(t.amount)); });
    return m;
  }, [txs]);

  const setBudget = async (categoryId: string, amount: number) => {
    if (!amount || amount < 0) {
      await supabase.from("budgets").delete().eq("category_id", categoryId).eq("month", monthStr);
    } else {
      await supabase.from("budgets").upsert(
        { user_id: user!.id, category_id: categoryId, amount, month: monthStr },
        { onConflict: "user_id,category_id,month" }
      );
    }
    toast.success("Budget saved");
    load();
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="p-5 md:p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Budgets</h1>
      <p className="text-muted-foreground mb-8">Set monthly limits per category — {format(new Date(), "MMMM yyyy")}</p>

      <div className="space-y-3">
        {cats.map((c) => {
          const b = budgets.find((x) => x.category_id === c.id);
          const sp = spent.get(c.id) ?? 0;
          const limit = b ? Number(b.amount) : 0;
          const pct = limit > 0 ? Math.min(100, (sp / limit) * 100) : 0;
          const over = limit > 0 && sp > limit;
          return (
            <div key={c.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="font-medium truncate">{c.name}</span>
                </div>
                <BudgetInput defaultValue={limit} onSave={(v) => setBudget(c.id, v)} />
              </div>
              {limit > 0 && (
                <>
                  <Progress value={pct} className={over ? "[&>div]:bg-destructive" : ""} />
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-muted-foreground">{formatMoney(sp, currency)} of {formatMoney(limit, currency)}</span>
                    <span className={over ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {over ? `Over by ${formatMoney(sp - limit, currency)}` : `${formatMoney(limit - sp, currency)} left`}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BudgetInput({ defaultValue, onSave }: { defaultValue: number; onSave: (v: number) => void }) {
  const [val, setVal] = useState(String(defaultValue || ""));
  useEffect(() => setVal(String(defaultValue || "")), [defaultValue]);
  return (
    <div className="flex gap-2 items-center">
      <Input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="0"
        className="w-28 text-right"
      />
      <Button size="sm" variant="outline" onClick={() => onSave(Number(val))}>Save</Button>
    </div>
  );
}
