import { useEffect, useState } from "react";
import { useStore, type GestureConfig, type DesktopAction } from "@/lib/gestureStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function GesturesPage() {
  const store = useStore();
  const [localGestures, setLocalGestures] = useState<GestureConfig[]>([]);

  useEffect(() => {
    void store.loadGestures();
  }, []);

  useEffect(() => {
    setLocalGestures(store.gestures);
  }, [store.gestures]);

  const addGesture = () => {
    const action: DesktopAction | undefined = store.supportedActions[0];
    if (!action) return;
    setLocalGestures((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "new_gesture",
        action,
        emoji: "🖐️",
        threshold: 0.82,
      },
    ]);
  };

  const removeGesture = (id: string) => {
    setLocalGestures((prev) => prev.filter((g) => g.id !== id));
  };

  const updateGesture = (id: string, field: keyof GestureConfig, value: string | number) => {
    setLocalGestures((prev) =>
      prev.map((g) => (g.id === id ? ({ ...g, [field]: value } as GestureConfig) : g))
    );
  };

  const save = async () => {
    const normalized = localGestures
      .map((g) => ({
        ...g,
        label: g.label.trim().toLowerCase(),
        emoji: g.emoji.trim(),
        threshold: Math.max(0.55, Math.min(0.98, Number(g.threshold))),
      }))
      .filter((g) => g.label.length > 0);

    await store.saveGestures(normalized);
    await store.loadModelStatus();
  };

  return (
    <div className="space-y-6">
      <Card className="border-cyan-400/20 bg-slate-950/55">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cyan-100">Gesture Registry</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" className="border-cyan-400/40 bg-slate-900/40" onClick={addGesture}>
              Add Gesture
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-500" onClick={() => void save()}>
              Save Registry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gesture Label</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Emoji</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localGestures.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <Input
                      value={g.label}
                      onChange={(e) => updateGesture(g.id, "label", e.target.value)}
                      className="bg-slate-900/50"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={g.action} onValueChange={(v) => updateGesture(g.id, "action", v)}>
                      <SelectTrigger className="bg-slate-900/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {store.supportedActions.map((action) => (
                          <SelectItem key={action} value={action}>
                            {action}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={g.emoji}
                      onChange={(e) => updateGesture(g.id, "emoji", e.target.value)}
                      className="w-20 bg-slate-900/50 text-center"
                      maxLength={3}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0.55}
                      max={0.98}
                      step={0.01}
                      value={g.threshold}
                      onChange={(e) => updateGesture(g.id, "threshold", Number(e.target.value))}
                      className="w-24 bg-slate-900/50"
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="destructive" onClick={() => removeGesture(g.id)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
