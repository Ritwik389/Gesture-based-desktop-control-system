import { useStore, SystemStatus } from "@/lib/mockStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Server, 
  Wifi, 
  BrainCircuit, 
  Database,
  ShieldCheck,
  Globe,
  RefreshCw
} from "lucide-react";

const StatusIndicator = ({ status }: { status: SystemStatus }) => {
  const colors = {
    ONLINE: "bg-emerald-500",
    OFFLINE: "bg-slate-500",
    ERROR: "bg-rose-500",
    CONNECTING: "bg-amber-500"
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2.5 w-2.5 rounded-full ${colors[status]}`} />
      <span className="font-mono text-sm">{status}</span>
    </div>
  );
};

export default function Status() {
  const store = useStore();

  const services = [
    { name: "Backend API", status: store.backendStatus, icon: Server, latency: "45ms", version: "v1.2.0" },
    { name: "WebSocket Gateway", status: store.wsStatus, icon: Globe, latency: "12ms", version: "v2.1.0" },
    { name: "ML Inference Engine", status: store.mlStatus, icon: BrainCircuit, latency: "120ms", version: "v2.4.1" },
    { name: "Database Cluster", status: "ONLINE", icon: Database, latency: "2ms", version: "PG 15" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
        <p className="text-muted-foreground mt-1">Operational health of all microservices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service) => (
          <Card key={service.name} className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-md border shadow-sm">
                    <service.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{service.name}</CardTitle>
                </div>
                <StatusIndicator status={service.status as SystemStatus} />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-xs text-muted-foreground uppercase font-semibold">Latency</p>
                   <p className="font-mono text-lg">{service.latency}</p>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground uppercase font-semibold">Version</p>
                   <p className="font-mono text-lg">{service.version}</p>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground uppercase font-semibold">Uptime</p>
                   <p className="font-mono text-lg">99.9%</p>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground uppercase font-semibold">Region</p>
                   <p className="font-mono text-lg">US-EAST</p>
                 </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Security Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm">TLS Encryption</span>
                <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Active (TLS 1.3)</Badge>
             </div>
             <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm">API Rate Limiting</span>
                <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Enabled</Badge>
             </div>
             <div className="flex items-center justify-between pb-2">
                <span className="text-sm">JWT Auth Token</span>
                <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Valid</Badge>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
