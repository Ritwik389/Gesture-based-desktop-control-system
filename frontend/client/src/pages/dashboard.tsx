import { useEffect } from "react";
import { useStore } from "@/lib/gestureStore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, Link2, ListChecks, Radar } from "lucide-react";

export default function Dashboard() {
  const store = useStore();

  useEffect(() => {
    void store.loadModelStatus();
    void store.loadGestures();
  }, []);

  const status = store.modelStatus;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Backend" value={store.backendStatus} icon={<Link2 className="h-4 w-4" />} />
        <SummaryCard title="Model" value={status?.is_trained ? "READY" : "UNTRAINED"} icon={<Cpu className="h-4 w-4" />} />
        <SummaryCard title="Gestures" value={String(status?.gestures_count ?? 0)} icon={<ListChecks className="h-4 w-4" />} />
        <SummaryCard
          title="Accuracy"
          value={status?.validation_accuracy == null ? "N/A" : `${Math.round(status.validation_accuracy * 100)}%`}
          icon={<Radar className="h-4 w-4" />}
        />
      </div>

      <Card className="border-cyan-400/20 bg-slate-950/55">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cyan-100">Live Detection</CardTitle>
          <Button variant="outline" className="border-cyan-400/30 bg-cyan-500/10" onClick={() => void store.loadModelStatus()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-black tracking-wide text-cyan-100">
            {store.gestureEmoji ? `${store.gestureEmoji} ` : ""}
            {store.gesture || "NONE"}
          </div>
          <div className="text-sm text-slate-300">Confidence: {Math.round(store.confidence * 100)}%</div>
          <div className="flex gap-2">
            <Button
              onClick={() => void store.toggleMonitoring(true)}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              Start Monitoring
            </Button>
            <Button
              onClick={() => void store.toggleMonitoring(false)}
              variant="outline"
              className="border-cyan-400/40 bg-slate-900/40"
            >
              Stop Monitoring
            </Button>
            <Badge className="bg-cyan-500/20 text-cyan-100">{store.status}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-cyan-400/20 bg-slate-950/55">
        <CardHeader>
          <CardTitle className="text-cyan-100">JARVIS Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-xs">
            {store.logs.length === 0 ? (
              <p className="text-slate-400">No logs yet.</p>
            ) : (
              store.logs.slice().reverse().map((log) => (
                <div key={log.id} className="rounded border border-cyan-400/20 bg-slate-900/55 p-2">
                  <div className="text-cyan-200">{new Date(log.timestamp).toLocaleTimeString()} [{log.type}]</div>
                  <div className="text-slate-300">{log.message}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-cyan-400/20 bg-slate-950/55">
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/70">{title}</p>
          <p className="text-xl font-bold text-cyan-100">{value}</p>
        </div>
        <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/15 p-2 text-cyan-200">{icon}</div>
      </CardContent>
    </Card>
  );
}
