import { useEffect, useState } from "react";
import { useStore } from "@/lib/gestureStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Import Button
import { 
  Hand, 
  Zap,
  Layout,
  MousePointer2,
  AppWindow,
  Activity,
  Play,
  Square
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

export default function Dashboard() {
  const store = useStore();
  const [chartData, setChartData] = useState(
    Array.from({ length: 20 }, (_, i) => ({ time: i, confidence: 0 }))
  );

  useEffect(() => {
    setChartData(prev => {
      const newData = [...prev.slice(1), { 
        time: prev[prev.length - 1].time + 1, 
        confidence: store.confidence * 100
      }];
      return newData;
    });
  }, [store.confidence]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER WITH START BUTTON */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Control Center</h1>
          <p className="text-muted-foreground mt-1">Real-time diagnostics of the gesture pipeline.</p>
        </div>
        
        <Button 
          size="lg"
          onClick={() => store.toggleMonitoring()}
          className={cn(
            "px-8 py-6 font-bold text-lg rounded-2xl shadow-lg transition-all active:scale-95",
            store.isMonitoring 
              ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20" 
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
          )}
        >
          {store.isMonitoring ? (
            <><Square className="mr-2 h-5 w-5 fill-current" /> Stop Monitoring</>
          ) : (
            <><Play className="mr-2 h-5 w-5 fill-current" /> Start Monitoring</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Gesture Signal</CardTitle>
            <CardDescription>Engine confidence levels over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Area 
                  type="monotone" 
                  dataKey="confidence" 
                  stroke="#2563EB" 
                  strokeWidth={3} 
                  fill="url(#colorConf)" 
                  animationDuration={300} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-none shadow-sm text-white overflow-hidden relative transition-colors duration-500",
          store.isMonitoring ? "bg-emerald-600" : "bg-blue-600"
        )}>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Hand size={120} />
          </div>
          <CardHeader>
            <CardTitle className="text-white">Live Detection</CardTitle>
            <CardDescription className="text-white/70">AI Perspective</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 relative z-10">
            <div className="h-24 w-24 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm border border-white/30">
              <Hand className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-3xl font-black tracking-tight uppercase">{store.gesture || "NONE"}</h3>
            <Badge className="mt-4 bg-white text-blue-600 hover:bg-white/90 border-none font-bold">
              {Math.round(store.confidence * 100)}% MATCH
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Window", value: "Desktop Agent", icon: AppWindow, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Control Mode", value: store.isMonitoring ? "ACTIVE" : "STANDBY", icon: MousePointer2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Mapped Action", value: store.mappings.find(m => m.gesture === store.gesture.toUpperCase())?.action || "IDLE", icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Neural Load", value: "4.2%", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm bg-white hover:scale-[1.02] transition-transform">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg font-bold text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>System Logs</CardTitle>
            <CardDescription>Neural link activity history</CardDescription>
          </div>
          <div className="h-8 w-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
            <Layout className="h-4 w-4 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 font-mono text-sm">
            {store.logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 border border-slate-100 animate-in slide-in-from-left-2">
                <span className="text-slate-400 w-24">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded text-[10px] uppercase",
                  log.type === 'SUCCESS' ? "bg-emerald-100 text-emerald-700" : 
                  log.type === 'ERROR' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                )}>{log.type}</span>
                <span className="text-slate-600">{log.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
