import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, ListPlus, PiggyBank, Sparkles, Settings, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page drifted off the map.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lumen — AI Personal Finance Tracker" },
      { name: "description", content: "Track expenses, set budgets, and get AI insights to grow your savings." },
      { property: "og:title", content: "Lumen — AI Personal Finance Tracker" },
      { property: "og:description", content: "Track expenses, set budgets, and get AI insights to grow your savings." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Lumen — AI Personal Finance Tracker" },
      { name: "twitter:description", content: "Track expenses, set budgets, and get AI insights to grow your savings." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/03503ccc-417d-43a9-961b-2c27d4bd9ad3/id-preview-fc110d89--1d2fe093-7d6f-452d-adc3-0a0df7c98a13.lovable.app-1776609338826.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/03503ccc-417d-43a9-961b-2c27d4bd9ad3/id-preview-fc110d89--1d2fe093-7d6f-452d-adc3-0a0df7c98a13.lovable.app-1776609338826.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <AppFrame />
      <Toaster richColors theme="dark" />
    </AuthProvider>
  );
}

function AppFrame() {
  const { user, loading, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isAuthRoute = path === "/auth" || path === "/";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || isAuthRoute) {
    return <Outlet />;
  }

  const nav = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/transactions", icon: ListPlus, label: "Transactions" },
    { to: "/budgets", icon: PiggyBank, label: "Budgets" },
    { to: "/insights", icon: Sparkles, label: "AI Insights" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card/40 backdrop-blur-xl p-5 gap-1">
        <Link to="/dashboard" className="flex items-center gap-2 mb-8 px-2">
          <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center glow">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold gradient-text font-display">Lumen</span>
        </Link>
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            activeProps={{ className: "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-secondary text-foreground" }}
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </Link>
        ))}
        <div className="mt-auto">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border flex justify-around py-2">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] text-muted-foreground"
            activeProps={{ className: "flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] text-primary" }}>
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>

      <main className="flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
