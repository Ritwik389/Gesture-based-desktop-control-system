import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/gestureStore";
import { Layout } from "@/components/layout/Layout";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import GesturesPage from "@/pages/mapping";
import LiveFeedPage from "@/pages/monitor";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      <Route path="/gestures">
        <Layout>
          <GesturesPage />
        </Layout>
      </Route>
      <Route path="/live-feed">
        <Layout>
          <LiveFeedPage />
        </Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const store = useStore();

  useEffect(() => {
    store.connect();
    void store.loadGestures();
    void store.loadModelStatus();
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
