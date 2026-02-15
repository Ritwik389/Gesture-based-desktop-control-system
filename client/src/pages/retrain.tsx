import { useStore } from "@/lib/mockStore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  BrainCircuit, 
  Terminal, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Database,
  Cpu
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function Retrain() {
  const { isTraining, trainingProgress, lastTrained, startTraining, mlStatus } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleStartTraining = () => {
    setIsDialogOpen(false);
    startTraining();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Model Retraining</h1>
        <p className="text-muted-foreground mt-1">Update the machine learning model with new dataset samples.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-2 border-primary/20 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Training Pipeline</CardTitle>
                <CardDescription>Current model status and operations</CardDescription>
              </div>
              <Badge variant={isTraining ? "default" : "secondary"}>
                {isTraining ? 'TRAINING IN PROGRESS' : 'IDLE'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
             {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-mono">{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className="h-3" />
              {isTraining && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  Optimizing neural weights... (Epoch {Math.floor(trainingProgress / 10)}/10)
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Dataset Size</span>
                </div>
                <p className="text-2xl font-mono font-bold">12,450</p>
                <p className="text-xs text-muted-foreground">Samples</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Model Ver.</span>
                </div>
                <p className="text-2xl font-mono font-bold">v2.4.1</p>
                <p className="text-xs text-muted-foreground">MobileNetV2</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Accuracy</span>
                </div>
                <p className="text-2xl font-mono font-bold">94.2%</p>
                <p className="text-xs text-muted-foreground">Validation</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Last retrained: <span className="font-mono">{new Date(lastTrained || '').toLocaleString()}</span>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={isTraining} size="lg" className="shadow-md">
                   <BrainCircuit className="mr-2 h-4 w-4" />
                   Trigger Retraining
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Retraining</DialogTitle>
                  <DialogDescription>
                    This will initiate a full retraining cycle on the connected GPU server. The system might experience higher latency during this process.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Warning</AlertTitle>
                     <AlertDescription>Drone control will be paused during the update phase (approx. 5s).</AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleStartTraining}>Start Process</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>

        {/* Console Output */}
        <Card className="md:col-span-2 bg-slate-950 text-slate-50 font-mono text-xs overflow-hidden">
          <CardHeader className="py-3 border-b border-slate-800">
             <div className="flex items-center gap-2">
               <Terminal className="h-4 w-4" />
               <span>Training Logs</span>
             </div>
          </CardHeader>
          <CardContent className="p-4 h-[200px] overflow-y-auto space-y-1">
             <div className="text-slate-400">$ init_training_sequence.py --force</div>
             <div className="text-emerald-400">[OK] GPU allocated (CUDA:0)</div>
             <div className="text-slate-300">Loading dataset manifest...</div>
             <div className="text-slate-300">Preprocessing 12,450 images...</div>
             {isTraining && (
                <>
                  <div className="text-slate-300">Epoch 1/10 - loss: 0.4532 - acc: 0.8234</div>
                  <div className="text-slate-300">Epoch 2/10 - loss: 0.3121 - acc: 0.8812</div>
                  <div className="text-slate-300">Epoch 3/10 - loss: 0.2844 - acc: 0.9105</div>
                  <div className="text-blue-400">... optimization in progress</div>
                </>
             )}
             {!isTraining && lastTrained && (
                <div className="text-emerald-400">[SUCCESS] Model saved to /models/v2.4.2.h5</div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
