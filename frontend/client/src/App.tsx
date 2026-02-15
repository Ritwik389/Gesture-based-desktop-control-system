import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/gestureStore";
import { Layout } from "@/components/layout/Layout";
import Monitor from "@/pages/monitor"; 
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Mapping from "@/pages/mapping";
import Status from "@/pages/status";
import { useEffect, useState } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setTimeout(() => setLocation("/login"), 0);
    return null;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/mapping">{() => <ProtectedRoute component={Mapping} />}</Route>
      <Route path="/status">{() => <ProtectedRoute component={Status} />}</Route>
      <Route path="/monitor">{() => <ProtectedRoute component={Monitor} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const store = useStore();

  useEffect(() => {
    // Start the connection once when the app starts
    store.connect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
