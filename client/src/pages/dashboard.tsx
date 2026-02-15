import { useEffect, useState } from "react";
import { useStore } from "@/lib/mockStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Hand, 
  Zap,
  Layout,
  MousePointer2,
  Volume2,
  Maximize,
  AppWindow,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";

const generateChartData = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    time: i,
    confidence: 70 + Math.random() * 25,
  }));
};

export default function Dashboard() {
  const store = useStore();
  const [chartData, setChartData] = useState(generateChartData());

  useEffect(() => {
    const interval = setInterval(() => {
      const gestures: any[] = ['SWIPE_LEFT', 'SWIPE_RIGHT', 'PINCH', 'SPREAD', 'ROTATE'];
      const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
      const confidence = 80 + Math.floor(Math.random() * 20);
      store.setGesture(randomGesture, confidence);
      
      setChartData(prev => [...prev.slice(1), { time: prev[prev.length - 1].time + 1, confidence }]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
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
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="confidence" stroke="#2563EB" strokeWidth={3} fill="url(#colorConf)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-blue-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Hand size={120} />
          </div>
          <CardHeader>
            <CardTitle className="text-white">Live Detection</CardTitle>
            <CardDescription className="text-blue-100">Most recent hand pose</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 relative z-10">
            <div className="h-24 w-24 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm border border-white/30">
              <Hand className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-3xl font-black tracking-tight">{store.lastGesture}</h3>
            <Badge className="mt-4 bg-white text-blue-600 hover:bg-white/90 border-none font-bold">
              {store.confidence}% MATCH
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Window", value: store.activeApp, icon: AppWindow, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Control Mode", value: "Smart Gestures", icon: MousePointer2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Mapped Action", value: store.mappings.find(m => m.gesture === store.lastGesture)?.action || "READY", icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Processor Load", value: "4.2%", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" }
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
            <CardDescription>Real-time execution history</CardDescription>
          </div>
          <div className="h-8 w-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
            <Layout className="h-4 w-4 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 font-mono text-sm">
            {store.logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 w-24">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded text-[10px] uppercase",
                  log.type === 'SUCCESS' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
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
