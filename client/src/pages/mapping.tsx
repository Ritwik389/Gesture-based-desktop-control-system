import { useState } from "react";
import { useStore, GestureType, DesktopAction } from "@/lib/mockStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hand, Save, RotateCcw, Monitor, MousePointer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ACTION_OPTIONS: { value: DesktopAction; label: string }[] = [
  { value: 'PREVIOUS_SLIDE', label: 'Previous Slide' },
  { value: 'NEXT_SLIDE', label: 'Next Slide' },
  { value: 'VOLUME_UP', label: 'Volume Up' },
  { value: 'VOLUME_DOWN', label: 'Volume Down' },
  { value: 'ZOOM_IN', label: 'Zoom In' },
  { value: 'ZOOM_OUT', label: 'Zoom Out' },
  { value: 'MUTE', label: 'Mute System' },
  { value: 'LOCK_SCREEN', label: 'Lock Computer' },
  { value: 'NONE', label: 'Do Nothing' },
];

export default function Mapping() {
  const { mappings, updateMapping, addLog } = useStore();
  const { toast } = useToast();
  const [localMappings, setLocalMappings] = useState(mappings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleActionChange = (gesture: GestureType, action: DesktopAction) => {
    setLocalMappings(prev => prev.map(m => m.gesture === gesture ? { ...m, action } : m));
    setHasChanges(true);
  };

  const handleSave = () => {
    localMappings.forEach(m => updateMapping(m.gesture, m.action));
    setHasChanges(false);
    addLog('SUCCESS', 'Action mappings synchronized with desktop agent');
    toast({ title: "Configuration Updated", description: "Your gestures are now mapped to desktop actions." });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Action Mapping</h1>
          <p className="text-muted-foreground mt-1">Configure your physical language to control OS shortcuts.</p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setLocalMappings(mappings)}>Discard</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>Apply Changes</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Visual Gesture</TableHead>
                  <TableHead className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">System Shortcut / Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localMappings.map((mapping) => (
                  <TableRow key={mapping.gesture} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                          <Hand size={18} />
                        </div>
                        <span className="font-bold text-slate-900 font-mono tracking-tight">{mapping.gesture}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Select 
                        value={mapping.action} 
                        onValueChange={(val) => handleActionChange(mapping.gesture, val as DesktopAction)}
                      >
                        <SelectTrigger className="w-full md:w-[280px] bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="py-2.5">
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
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-slate-900 text-white p-6">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-blue-400" />
              OS Integration
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Mappings are pushed directly to the background service. Ensure "Accessibility Access" is granted in System Preferences.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-xs font-medium">Auto-Focus App</span>
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-xs font-medium">Global Shortcuts</span>
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            </div>
          </Card>

          <div className="aspect-square bg-blue-50 rounded-2xl border-2 border-dashed border-blue-100 flex flex-col items-center justify-center p-8 text-center">
            <MousePointer className="h-10 w-10 text-blue-400 mb-4 animate-bounce" />
            <h5 className="font-bold text-blue-900">Training Mode</h5>
            <p className="text-xs text-blue-600/70 mt-2">Open the camera feed to record new custom gestures for specific apps.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
