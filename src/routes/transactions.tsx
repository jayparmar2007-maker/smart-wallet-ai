import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Lumen" }] }),
  component: TransactionsPage,
});

type Tx = { id: string; amount: number; type: "income" | "expense"; occurred_on: string; category_id: string | null; note: string | null };
type Cat = { id: string; name: string; color: string; type: string };

function TransactionsPage() {
  const { user, loading } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [currency, setCurrency] = useState("USD");

  const load = async () => {
    const [{ data: t }, { data: c }, { data: p }] = await Promise.all([
      supabase.from("transactions").select("*").order("occurred_on", { ascending: false }).limit(200),
      supabase.from("categories").select("*"),
      supabase.from("profiles").select("currency").eq("user_id", user!.id).maybeSingle(),
    ]);
    setTxs((t ?? []) as Tx[]);
    setCats((c ?? []) as Cat[]);
    setCurrency((p as any)?.currency ?? "USD");
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!categoryId) return toast.error("Pick a category");
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id, type, amount: amt, category_id: categoryId, note: note || null, occurred_on: date,
    });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setAmount(""); setNote(""); setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    load();
  };

  const filteredCats = cats.filter((c) => c.type === type);

  return (
    <div className="p-5 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="glow"><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New transaction</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={type === "expense" ? "default" : "outline"} onClick={() => { setType("expense"); setCategoryId(""); }}>Expense</Button>
                <Button type="button" variant={type === "income" ? "default" : "outline"} onClick={() => { setType("income"); setCategoryId(""); }}>Income</Button>
              </div>
              <div>
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1.5" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pick one" /></SelectTrigger>
                  <SelectContent>
                    {filteredCats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: c.color }} />
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Note (optional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lunch with friends" className="mt-1.5" />
              </div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card rounded-2xl divide-y divide-border">
        {txs.length === 0 && <div className="p-12 text-center text-muted-foreground text-sm">No transactions yet — add your first one!</div>}
        {txs.map((t) => {
          const c = cats.find((x) => x.id === t.category_id);
          return (
            <div key={t.id} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: (c?.color ?? "#64748b") + "30" }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c?.color ?? "#64748b" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c?.name ?? "Uncategorized"}</div>
                <div className="text-xs text-muted-foreground truncate">{t.note || format(new Date(t.occurred_on), "MMM d, yyyy")}</div>
              </div>
              <div className={`font-semibold ${t.type === "income" ? "text-success" : ""}`}>
                {t.type === "income" ? "+" : "−"}{formatMoney(Number(t.amount), currency)}
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
