import { useState } from "react";
import { QAMatrixEntry } from "@/types/qaMatrix";
import { recalculateStatuses } from "@/utils/qaCalculations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface AddConcernDialogProps {
  nextSNo: number;
  onAdd: (entry: QAMatrixEntry) => void;
}

const n = null;

const AddConcernDialog = ({ nextSNo, onAdd }: AddConcernDialogProps) => {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [station, setStation] = useState("");
  const [designation, setDesignation] = useState("Trim");
  const [concern, setConcern] = useState("");
  const [defectRating, setDefectRating] = useState<1 | 3 | 5>(1);
  const [resp, setResp] = useState("");
  const [action, setAction] = useState("");
  const [target, setTarget] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !station || !concern) return;

    const entry: QAMatrixEntry = {
      sNo: nextSNo,
      source,
      operationStation: station,
      designation,
      concern,
      defectRating,
      recurrence: 0,
      weeklyRecurrence: [0, 0, 0, 0, 0, 0],
      recurrenceCountPlusDefect: defectRating,
      trim: { T10: n, T20: n, T30: n, T40: n, T50: n, T60: n, T70: n, T80: n, T90: n, T100: n, TPQG: n },
      chassis: { C10: n, C20: n, C30: n, C40: n, C45: n, P10: n, P20: n, P30: n, C50: n, C60: n, C70: n, RSub: n, TS: n, C80: n, CPQG: n },
      final: { F10: n, F20: n, F30: n, F40: n, F50: n, F60: n, F70: n, F80: n, F90: n, F100: n, FPQG: n, ResidualTorque: n },
      qControl: { freqControl_1_1: n, visualControl_1_2: n, periodicAudit_1_3: n, humanControl_1_4: n, saeAlert_3_1: n, freqMeasure_3_2: n, manualTool_3_3: n, humanTracking_3_4: n, autoControl_5_1: n, impossibility_5_2: n, saeProhibition_5_3: n },
      qControlDetail: { CVT: n, SHOWER: n, DynamicUB: n, CC4: n },
      controlRating: { MFG: 0, Quality: 1, Plant: 1 },
      guaranteedQuality: { Workstation: n, MFG: n, Plant: n },
      workstationStatus: "OK",
      mfgStatus: "NG",
      plantStatus: "OK",
      mfgAction: action,
      resp,
      target,
    };

    onAdd(recalculateStatuses(entry));
    setOpen(false);
    setSource("");
    setStation("");
    setConcern("");
    setDefectRating(1);
    setResp("");
    setAction("");
    setTarget("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Concern
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Concern</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="source">Source *</Label>
              <Input id="source" placeholder="e.g. Field, SCA, DVX" value={source} onChange={(e) => setSource(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="station">Station *</Label>
              <Input id="station" placeholder="e.g. C80, F30" value={station} onChange={(e) => setStation(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="area">Area</Label>
              <select id="area" value={designation} onChange={(e) => setDesignation(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background">
                <option value="Trim">Trim</option>
                <option value="Chassis">Chassis</option>
                <option value="Final">Final</option>
                <option value="TRIM">TRIM</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rating">Defect Rating *</Label>
              <select id="rating" value={defectRating} onChange={(e) => setDefectRating(Number(e.target.value) as 1 | 3 | 5)} className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background">
                <option value={1}>1 - Low</option>
                <option value={3}>3 - Medium</option>
                <option value={5}>5 - High</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="concern">Concern Description *</Label>
            <Input id="concern" placeholder="Describe the quality concern..." value={concern} onChange={(e) => setConcern(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="action">MFG Action</Label>
            <Input id="action" placeholder="Action taken..." value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="resp">Responsible</Label>
              <Input id="resp" placeholder="Person name" value={resp} onChange={(e) => setResp(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target">Target</Label>
              <Input id="target" placeholder="e.g. WK12" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Add Concern</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddConcernDialog;
