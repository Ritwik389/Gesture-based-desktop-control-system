import React from "react";
import { Link, useLocation } from "wouter";
import { Bot, Activity, Hand, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/gestureStore";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const wsStatus = useStore((s) => s.wsStatus);

  const navItems = [
    { label: "Dashboard", icon: Activity, href: "/" },
    { label: "Gestures", icon: Hand, href: "/gestures" },
    { label: "Live Feed", icon: Camera, href: "/live-feed" },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_0%,_rgba(8,145,178,0.26),_transparent_35%),radial-gradient(circle_at_85%_10%,_rgba(37,99,235,0.2),_transparent_32%),linear-gradient(180deg,_#030712_0%,_#020617_45%,_#02030f_100%)] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/40 bg-cyan-500/15 shadow-[0_0_28px_rgba(6,182,212,0.35)] transition-all duration-300 hover:scale-105">
              <Bot className="h-5 w-5 text-cyan-100" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Assistant Core</p>
              <h1 className="text-xl font-black tracking-[0.2em] text-cyan-100">JARVIS</h1>
            </div>
          </div>

          <div className={cn(
            "rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em]",
            wsStatus === "ONLINE"
              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
              : "border-rose-400/40 bg-rose-500/15 text-rose-200 animate-pulse"
          )}>
            {wsStatus === "ONLINE" ? "Linked" : "Offline"}
          </div>
        </div>

        <nav className="mx-auto flex max-w-[1200px] gap-2 px-6 pb-4">
          {navItems.map((item) => {
            const active = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-300",
                    active
                      ? "border-cyan-300/50 bg-cyan-500/20 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      : "border-cyan-500/20 bg-slate-900/35 text-slate-300 hover:border-cyan-300/40 hover:text-cyan-100"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-7 animate-in fade-in duration-500">{children}</main>
    </div>
  );
}
