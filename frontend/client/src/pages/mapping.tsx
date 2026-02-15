import { useState, useEffect } from "react";
import { useStore, GestureType, DesktopAction } from "@/lib/gestureStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Hand, Monitor, MousePointer, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Updated to match the types in gestureStore.ts
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

const GESTURE_OPTIONS: GestureType[] = ['ROCK', 'PAPER', 'NOTHING', 'SWIPE_LEFT', 'SWIPE_RIGHT'];

export default function Mapping() {
  const { mappings, updateMapping, addMapping, removeMapping } = useStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Local state to track unsaved changes in the UI
  const [localMappings, setLocalMappings] = useState(mappings);
  const [hasChanges, setHasChanges] = useState(false);

  // Keep local state in sync if store changes (e.g., adding a new row)
  useEffect(() => {
    setLocalMappings(mappings);
  }, [mappings]);

  const handleUpdate = (id: string, field: 'gesture' | 'action', value: string) => {
    setLocalMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // 1. Update the Zustand store first
    localMappings.forEach(m => {
      updateMapping(m.id, 'gesture', m.gesture);
      updateMapping(m.id, 'action', m.action);
    });

    // 2. Sync the mapping dictionary with the Python Backend
    try {
      const response = await fetch("http://127.0.0.1:8000/api/sync_mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: localMappings }),
      });

      if (response.ok) {
        setHasChanges(false);
        toast({ 
          title: "Configuration Synced", 
          description: "Hardware actions updated in real-time." 
        });
      } else {
        throw new Error("Failed to sync");
      }
    } catch (err) {
      toast({ 
        variant: "destructive", 
        title: "Sync Failed", 
        description: "Check if your Python backend is running." 
      });
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Action Mapping</h1>
          <p className="text-muted-foreground mt-1">Link your physical gestures to system commands.</p>
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
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localMappings.map((mapping) => (
                  <TableRow key={mapping.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                          <Hand size={18} />
                        </div>
                        <Select 
                          value={mapping.gesture} 
                          onValueChange={(val) => handleUpdate(mapping.id, 'gesture', val)}
                        >
                          <SelectTrigger className="w-full md:w-[180px] font-bold font-mono border-none shadow-none focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GESTURE_OPTIONS.map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Select 
                        value={mapping.action} 
                        onValueChange={(val) => handleUpdate(mapping.id, 'action', val)}
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
                    <TableCell className="pr-6">
                      <Button variant="ghost" size="icon" onClick={() => removeMapping(mapping.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button 
              variant="ghost" 
              className="w-full rounded-none border-t border-slate-100 py-6 text-slate-500 hover:bg-slate-50 flex gap-2"
              onClick={addMapping}
            >
              <Plus size={16} /> Add New Gesture Mapping
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-slate-900 text-white p-6">
            <h4 className="font-bold mb-4 flex items-center gap-2 text-blue-400">
              <Monitor className="h-4 w-4" />
              OS Integration
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Ensure "Accessibility Access" is granted in System Settings for the terminal running your Python agent.
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

          {/* Training Mode Link */}
          <div 
            onClick={() => setLocation('/monitor')}
            className="cursor-pointer aspect-square bg-blue-50 rounded-2xl border-2 border-dashed border-blue-100 flex flex-col items-center justify-center p-8 text-center hover:bg-blue-100/50 hover:border-blue-300 transition-all group"
          >
            <MousePointer className="h-10 w-10 text-blue-400 mb-4 group-hover:animate-bounce" />
            <h5 className="font-bold text-blue-900">Training Mode</h5>
            <p className="text-xs text-blue-600/70 mt-2">Record your custom gestures for specific apps.</p>
          </div>
        </div>
      </div>
    </div>
  );
}