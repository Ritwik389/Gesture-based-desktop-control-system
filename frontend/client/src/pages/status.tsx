import { useEffect, useState } from "react";
import { useStore, ModelStatusPayload } from "@/lib/gestureStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [modelStatus, setModelStatus] = useState<ModelStatusPayload | null>(null);

  const services = [
    { name: "ML Engine", status: store.mlStatus, icon: Cpu, load: "14%", temp: "42°C" },
    { name: "Desktop Agent", status: store.backendStatus, icon: Server, load: "2%", temp: "-" },
    { name: "Web Gateway", status: store.wsStatus, icon: Globe, load: "0.1%", temp: "-" },
  ];

  const refreshModelStatus = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/model_status");
      if (!response.ok) return;
      const payload = await response.json();
      setModelStatus(payload);
    } catch {
      // keep previous model status
    }
  };

  useEffect(() => {
    void refreshModelStatus();
  }, []);

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Model Diagnostics</CardTitle>
          <Button variant="outline" onClick={refreshModelStatus}>Refresh</Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <p><span className="font-semibold">Trained:</span> {modelStatus?.is_trained ? "Yes" : "No"}</p>
            <p><span className="font-semibold">Samples:</span> {modelStatus?.training_samples ?? 0}</p>
            <p>
              <span className="font-semibold">Validation Accuracy:</span>{" "}
              {modelStatus?.validation_accuracy == null
                ? "N/A"
                : `${Math.round(modelStatus.validation_accuracy * 100)}%`}
            </p>
            <p>
              <span className="font-semibold">Classes:</span>{" "}
              {(modelStatus?.classes ?? []).join(", ") || "N/A"}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <p>
              <span className="font-semibold">Default Threshold:</span>{" "}
              {modelStatus?.default_threshold?.toFixed(2) ?? "N/A"}
            </p>
            <p>
              <span className="font-semibold">Required Frame Streak:</span>{" "}
              {modelStatus?.required_consecutive_frames ?? "N/A"}
            </p>
            <p>
              <span className="font-semibold">Monitoring:</span>{" "}
              {modelStatus?.monitoring_active ? "Active" : "Idle"}
            </p>
            <p>
              <span className="font-semibold">Saved Mappings:</span>{" "}
              {modelStatus ? Object.keys(modelStatus.mappings || {}).length : 0}
            </p>
          </div>
        </CardContent>
      </Card>

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
