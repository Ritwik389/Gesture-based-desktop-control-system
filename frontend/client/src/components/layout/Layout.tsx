import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Monitor, 
  Hand, 
  Settings, 
  Activity, 
  LogOut, 
  Menu,
  Shield,
  Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/gestureStore";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  children: React.ReactNode;
}

export function Layout({ children }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [location] = useLocation();
  const logout = useStore((state) => state.logout);
  const { toast } = useToast();

  const navItems = [
    { label: "Control Center", icon: Monitor, href: "/" },
    { label: "Action Mapping", icon: Hand, href: "/mapping" },
    { label: "System Health", icon: Activity, href: "/status" },
  ];

  const handleLogout = () => {
    logout();
    toast({ title: "Session Ended", description: "Gesture control disabled." });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform md:translate-x-0 md:static flex flex-col",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-20 flex items-center px-8">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <Hand className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">GestureOS</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a className={cn(
                  "flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                  isActive 
                    ? "bg-blue-50 text-blue-700 shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}>
                  <item.icon className={cn("h-5 w-5 mr-3", isActive ? "text-blue-600" : "text-slate-400")} />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
          <h2 className="text-lg font-bold text-slate-900">
            {navItems.find(i => i.href === location)?.label || "Workspace"}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Engine Active</span>
            </div>
            <Button variant="outline" size="icon" className="md:hidden" onClick={() => setIsMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
