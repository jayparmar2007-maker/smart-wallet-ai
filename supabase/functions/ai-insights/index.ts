// AI Insights edge function — analyzes user's transactions via Lovable AI Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const sinceStr = since.toISOString().slice(0, 10);

    const [{ data: txs }, { data: cats }, { data: profile }] = await Promise.all([
      supabase.from("transactions").select("amount,type,occurred_on,category_id,note").gte("occurred_on", sinceStr),
      supabase.from("categories").select("id,name,type"),
      supabase.from("profiles").select("monthly_income,savings_goal,currency").eq("user_id", user.id).maybeSingle(),
    ]);

    const catMap = new Map((cats ?? []).map((c: any) => [c.id, c.name]));
    const totals: Record<string, number> = {};
    let income = 0, expense = 0;
    for (const t of txs ?? []) {
      const amt = Number(t.amount);
      if (t.type === "income") income += amt;
      else {
        expense += amt;
        const k = catMap.get(t.category_id) ?? "Other";
        totals[k] = (totals[k] ?? 0) + amt;
      }
    }

    const summary = {
      currency: profile?.currency ?? "USD",
      monthly_income_setting: profile?.monthly_income ?? 0,
      savings_goal: profile?.savings_goal ?? 0,
      last_3_months_income: Math.round(income),
      last_3_months_expense: Math.round(expense),
      transactions_count: txs?.length ?? 0,
      spending_by_category: Object.fromEntries(
        Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v)]),
      ),
    };

    if ((txs?.length ?? 0) === 0) {
      return new Response(JSON.stringify({ insights: "Add a few transactions first and come back — I'll analyze them for you!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a friendly, sharp personal finance coach. Analyze the user's recent spending data and give concise, actionable insights. Use short paragraphs and bullet points. Cover: 1) top spending patterns, 2) 2-3 specific savings opportunities, 3) any unusual behavior, 4) a brief next-month prediction. Keep the whole response under 250 words. Be warm but direct.",
          },
          { role: "user", content: `Here is my last-3-months data (currency: ${summary.currency}):\n\n${JSON.stringify(summary, null, 2)}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "AI rate limit hit. Try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("AI error:", aiRes.status, t);
      throw new Error("AI request failed");
    }

    const aiData = await aiRes.json();
    const insights = aiData.choices?.[0]?.message?.content ?? "No insights generated.";

    return new Response(JSON.stringify({ insights }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("ai-insights error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
