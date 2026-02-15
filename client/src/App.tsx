import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/mockStore";
import { Layout } from "@/components/layout/Layout";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Mapping from "@/pages/mapping";
import Retrain from "@/pages/retrain";
import Status from "@/pages/status";

// Wrapper for protected routes
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    // We use a small timeout to avoid render-cycle conflicts, though usually safe here
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
      
      {/* Protected Routes */}
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/mapping">
        {() => <ProtectedRoute component={Mapping} />}
      </Route>
      <Route path="/retrain">
        {() => <ProtectedRoute component={Retrain} />}
      </Route>
      <Route path="/status">
        {() => <ProtectedRoute component={Status} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
