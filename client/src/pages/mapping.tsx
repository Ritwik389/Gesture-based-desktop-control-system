import { useState } from "react";
import { useStore, GestureType, DroneAction } from "@/lib/mockStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hand, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ACTION_OPTIONS: { value: DroneAction; label: string }[] = [
  { value: 'HOVER', label: 'Hover in Place' },
  { value: 'TAKEOFF', label: 'Take Off' },
  { value: 'LAND', label: 'Land Safely' },
  { value: 'MOVE_UP', label: 'Ascend (Up)' },
  { value: 'MOVE_DOWN', label: 'Descend (Down)' },
  { value: 'ROTATE_LEFT', label: 'Yaw Left' },
  { value: 'ROTATE_RIGHT', label: 'Yaw Right' },
  { value: 'Flip', label: 'Stunt Flip' },
  { value: 'NONE', label: 'No Action' },
];

export default function Mapping() {
  const { mappings, updateMapping, addLog } = useStore();
  const { toast } = useToast();
  const [localMappings, setLocalMappings] = useState(mappings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleActionChange = (gesture: GestureType, action: DroneAction) => {
    setLocalMappings(prev => prev.map(m => m.gesture === gesture ? { ...m, action } : m));
    setHasChanges(true);
  };

  const handleSave = () => {
    localMappings.forEach(m => updateMapping(m.gesture, m.action));
    setHasChanges(false);
    addLog('INFO', 'Gesture mappings updated by user');
    toast({
      title: "Configuration Saved",
      description: "New gesture control mappings are now active.",
    });
  };

  const handleReset = () => {
    setLocalMappings(mappings);
    setHasChanges(false);
    toast({
      title: "Changes Discarded",
      description: "Reverted to last saved configuration.",
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gesture Mapping</h1>
        <p className="text-muted-foreground mt-1">Configure how hand gestures translate to drone commands.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Configuration</CardTitle>
              <CardDescription>Map detected hand poses to flight actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Icon</TableHead>
                    <TableHead>Gesture Name</TableHead>
                    <TableHead>Mapped Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localMappings.map((mapping) => (
                    <TableRow key={mapping.gesture}>
                      <TableCell>
                        <div className="h-10 w-10 rounded-md bg-muted/50 flex items-center justify-center">
                          <Hand className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium font-mono">
                        {mapping.gesture}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={mapping.action} 
                          onValueChange={(val) => handleActionChange(mapping.gesture, val as DroneAction)}
                        >
                          <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {hasChanges && (
                <div className="mt-6 flex items-center justify-end gap-2 animate-in fade-in slide-in-from-bottom-2">
                  <Button variant="ghost" onClick={handleReset}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• <strong>Safety First:</strong> Ensure 'Closed Fist' is always mapped to 'Land' or 'Hover' for emergency stops.</p>
              <p>• <strong>Complexity:</strong> Simple gestures like 'Up/Down' are more reliable than complex finger signs.</p>
              <p>• <strong>Latency:</strong> Changes take effect immediately after saving.</p>
            </CardContent>
          </Card>
          
          <div className="relative aspect-square rounded-xl overflow-hidden border bg-muted/20 flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            <div className="text-center space-y-2 p-4">
              <Hand className="h-12 w-12 mx-auto text-primary opacity-50" />
              <p className="text-sm font-medium">Gesture Preview</p>
              <p className="text-xs text-muted-foreground">Perform a gesture to see it highlighted in the table (Requires Live Camera)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
