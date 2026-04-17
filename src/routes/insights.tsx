import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "AI Insights — Lumen" }] }),
  component: InsightsPage,
});

function InsightsPage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [insights, setInsights] = useState<string>("");

  const run = async () => {
    setBusy(true);
    setInsights("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data?.insights ?? "No insights generated.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate insights");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="p-5 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center glow">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">AI Insights</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Personalized analysis of your spending — find savings, spot patterns, and predict next month.
      </p>

      <Button size="lg" onClick={run} disabled={busy} className="glow mb-8">
        {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing…</> : <><Sparkles className="h-4 w-4 mr-2" /> Analyze my spending</>}
      </Button>

      {insights && (
        <div className="glass-card rounded-2xl p-6 whitespace-pre-wrap leading-relaxed text-[0.95rem]">
          {insights}
        </div>
      )}

      {!insights && !busy && (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
          Click the button above to get your first AI breakdown.
        </div>
      )}
    </div>
  );
}
