import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Lumen" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [goal, setGoal] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setName(data.display_name ?? "");
      setIncome(String(data.monthly_income ?? ""));
      setGoal(String(data.savings_goal ?? ""));
      setCurrency(data.currency ?? "USD");
    });
  }, [user?.id]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      display_name: name,
      monthly_income: Number(income) || 0,
      savings_goal: Number(goal) || 0,
      currency,
    }).eq("user_id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  return (
    <div className="p-5 md:p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div>
          <Label>Display name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Monthly income</Label>
            <Input type="number" value={income} onChange={(e) => setIncome(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Savings goal</Label>
            <Input type="number" value={goal} onChange={(e) => setGoal(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <div>
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD", "BRL"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={busy} className="w-full glow">{busy ? "Saving…" : "Save changes"}</Button>
      </div>

      <Button variant="outline" className="mt-6 w-full" onClick={() => signOut()}>
        <LogOut className="h-4 w-4 mr-2" /> Sign out
      </Button>
    </div>
  );
}
