import { useEffect, useState } from "react";
import { useStore } from "@/lib/mockStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Wifi, 
  Battery, 
  Activity, 
  Hand, 
  Maximize2,
  Zap,
  Clock,
  Navigation,
  BrainCircuit,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";

// Mock data for the chart
const generateChartData = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    time: i,
    confidence: 60 + Math.random() * 35,
  }));
};

export default function Dashboard() {
  const store = useStore();
  const [chartData, setChartData] = useState(generateChartData());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Simulation effect
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate incoming gesture data
      if (store.droneStatus === 'FLYING') {
        const gestures: any[] = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'OPEN_PALM'];
        const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
        const confidence = 85 + Math.floor(Math.random() * 15);
        store.setGesture(randomGesture, confidence);
        
        // Update chart
        setChartData(prev => {
          const newData = [...prev.slice(1), { time: prev[prev.length - 1].time + 1, confidence }];
          return newData;
        });
      }
      setCurrentTime(new Date());
    }, 2000);

    return () => clearInterval(interval);
  }, [store.droneStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-emerald-500';
      case 'OFFLINE': return 'bg-slate-500';
      case 'ERROR': return 'bg-rose-500';
      case 'CONNECTING': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground mt-1">Real-time telemetry and gesture monitoring.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border shadow-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-mono font-medium">
            {currentTime.toLocaleTimeString()}
          </span>
          <div className="h-4 w-[1px] bg-border mx-2" />
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getStatusColor(store.wsStatus)}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${getStatusColor(store.wsStatus)}`}></span>
            </span>
            <span className="text-xs font-medium uppercase text-muted-foreground">System Live</span>
          </div>
        </div>
      </div>

      {/* Top Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Drone Status</p>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">{store.droneStatus}</h2>
              </div>
            </div>
            <div className={cn("h-12 w-12 rounded-full flex items-center justify-center", 
              store.droneStatus === 'FLYING' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            )}>
              <Navigation className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Battery Level</p>
              <h2 className="text-2xl font-bold tracking-tight">{store.batteryLevel}%</h2>
            </div>
            <div className={cn("h-12 w-12 rounded-full flex items-center justify-center", 
              store.batteryLevel > 20 ? "bg-primary/10 text-primary" : "bg-rose-100 text-rose-600"
            )}>
              <Battery className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Signal Strength</p>
              <h2 className="text-2xl font-bold tracking-tight">{store.wifiSignal}%</h2>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Wifi className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">ML Confidence</p>
              <h2 className="text-2xl font-bold tracking-tight">{store.confidence}%</h2>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center">
              <BrainCircuit className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Live Gesture Feed */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-primary/20 shadow-md">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle>Live Telemetry</CardTitle>
                </div>
                <Badge variant="outline" className="font-mono text-xs">CHANNEL: 5.8GHz</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px] w-full bg-gradient-to-b from-background to-muted/20 p-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          borderRadius: '8px', 
                          border: '1px solid hsl(var(--border))',
                          boxShadow: 'var(--shadow-md)'
                        }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ display: 'none' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="confidence" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorConf)" 
                      />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Detected Gesture</CardTitle>
                <CardDescription>Current hand pose classification</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="h-32 w-32 rounded-full border-4 border-muted flex items-center justify-center mb-4 relative overflow-hidden bg-muted/20">
                  <div className={`absolute inset-0 bg-primary/10 transition-transform duration-300 ${store.confidence > 80 ? 'scale-100' : 'scale-0'}`} />
                  <Hand className="h-16 w-16 text-primary relative z-10" />
                </div>
                <h3 className="text-2xl font-black tracking-tighter text-foreground">{store.lastGesture}</h3>
                <Badge variant="secondary" className="mt-2">
                  {store.confidence}% Confidence
                </Badge>
              </CardContent>
            </Card>

            <Card>
               <CardHeader>
                <CardTitle>Mapped Action</CardTitle>
                <CardDescription>Active command execution</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8">
                 <div className="h-32 w-32 rounded-full border-4 border-dashed border-muted flex items-center justify-center mb-4 bg-muted/10">
                  <Zap className="h-16 w-16 text-amber-500" />
                </div>
                <h3 className="text-2xl font-black tracking-tighter text-foreground">
                  {store.mappings.find(m => m.gesture === store.lastGesture)?.action || 'IDLE'}
                </h3>
                <Badge variant="secondary" className="mt-2">
                  Latency: 12ms
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Col - Controls & Logs */}
        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Flight Controls</CardTitle>
              <CardDescription>Manual overrides and emergency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <Button 
                size="lg" 
                className={cn(
                  "w-full h-16 text-lg font-bold shadow-lg transition-all",
                  store.droneStatus === 'FLYING' 
                    ? "bg-rose-500 hover:bg-rose-600 text-white" 
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                )}
                onClick={store.toggleDroneStatus}
              >
                {store.droneStatus === 'FLYING' ? (
                  <>
                    <LogOut className="mr-2 h-6 w-6" />
                    LAND DRONE
                  </>
                ) : (
                  <>
                    <Maximize2 className="mr-2 h-6 w-6" />
                    INITIATE TAKEOFF
                  </>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                 <Button variant="outline" className="h-12 border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-900/50 dark:hover:bg-rose-900/20">
                    Emergency Stop
                 </Button>
                 <Button variant="outline" className="h-12">
                    Calibrate Sensors
                 </Button>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-semibold mb-3 flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                  System Logs
                </h4>
                <div className="space-y-2 h-[200px] overflow-y-auto pr-2 font-mono text-xs">
                  {store.logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-muted-foreground">
                      <span className="opacity-50 min-w-[60px]">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}</span>
                      <span className={cn(
                        log.type === 'ERROR' && "text-rose-500 font-bold",
                        log.type === 'SUCCESS' && "text-emerald-500",
                        log.type === 'WARNING' && "text-amber-500"
                      )}>{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
