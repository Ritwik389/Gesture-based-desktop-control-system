import { useStore, SystemStatus } from "@/lib/mockStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Server, 
  Cpu, 
  ShieldCheck,
  Zap,
  Activity,
  Globe
} from "lucide-react";

export default function Status() {
  const store = useStore();

  const services = [
    { name: "ML Engine", status: store.mlStatus, icon: Cpu, load: "14%", temp: "42°C" },
    { name: "Desktop Agent", status: store.backendStatus, icon: Server, load: "2%", temp: "-" },
    { name: "Web Gateway", status: store.wsStatus, icon: Globe, load: "0.1%", temp: "-" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Health</h1>
        <p className="text-muted-foreground mt-1">Real-time diagnostics of the gesture processing pipeline.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card key={service.name} className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <service.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-base text-slate-900">{service.name}</CardTitle>
                </div>
                <Badge className={cn(
                  "border-none font-bold",
                  service.status === 'ONLINE' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>{service.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Compute Load</p>
                <p className="text-2xl font-black text-slate-900">{service.load}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Efficiency</p>
                <p className="text-2xl font-black text-slate-900">99.2%</p>
              </div>
              {service.temp !== "-" && (
                <div className="col-span-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Core Temperature</span>
                    <span className="font-bold text-orange-600">{service.temp}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Security & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { label: "Local Processing", desc: "No video data leaves this machine.", icon: ShieldCheck },
             { label: "Encrypted RPC", desc: "Agent communication is TLS 1.3 secured.", icon: Zap },
             { label: "Access Control", desc: "OS permissions are restricted to UI events.", icon: Activity }
           ].map((item, i) => (
             <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
               <item.icon className="h-6 w-6 text-blue-600 mb-3" />
               <h5 className="font-bold text-slate-900 mb-1">{item.label}</h5>
               <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
             </div>
           ))}
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...inputs: any) {
  return inputs.filter(Boolean).join(" ");
}
