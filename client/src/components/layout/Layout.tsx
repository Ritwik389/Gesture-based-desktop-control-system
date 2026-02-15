import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Hand, 
  BrainCircuit, 
  Activity, 
  LogOut, 
  Menu,
  X,
  Plane,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/mockStore";
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
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "Gesture Mapping", icon: Hand, href: "/mapping" },
    { label: "Model Retraining", icon: BrainCircuit, href: "/retrain" },
    { label: "System Status", icon: Activity, href: "/status" },
  ];

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "See you next time, pilot.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen flex flex-col shadow-xl md:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Plane className="h-6 w-6 text-primary mr-2" />
          <span className="font-bold text-lg tracking-tight">AeroGesture</span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a 
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}
                  <item.icon className={cn("h-5 w-5 mr-3", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-border bg-card flex items-center justify-between px-4 z-30">
          <div className="flex items-center">
            <Plane className="h-6 w-6 text-primary mr-2" />
            <span className="font-bold text-lg">AeroGesture</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
           <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
           </div>
        </div>
      </main>
    </div>
  );
}
