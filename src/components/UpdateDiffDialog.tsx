import { useState, useMemo } from "react";
import { QAMatrixEntry } from "@/types/qaMatrix";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Undo2, CheckCircle, X } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

export interface DiffEntry {
  sNo: number;
  concern: string;
  field: string;
  before: string | number;
  after: string | number;
}

interface UpdateDiffDialogProps {
  open: boolean;
  onClose: () => void;
  diffs: DiffEntry[];
  onUndo: () => void;
  isApplied: boolean;
}

const UpdateDiffDialog = ({ open, onClose, diffs, onUndo, isApplied }: UpdateDiffDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApplied ? (
              <>
                <CheckCircle className="w-5 h-5 text-success" />
                Repeat Data Applied to QA Matrix
              </>
            ) : (
              "Update Preview"
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-auto flex-1">
          {diffs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No changes to show</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-muted">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-bold">#</th>
                  <th className="px-3 py-2 text-left font-bold">Concern</th>
                  <th className="px-3 py-2 text-left font-bold">Field</th>
                  <th className="px-3 py-2 text-center font-bold">Before</th>
                  <th className="px-3 py-2 text-center font-bold"></th>
                  <th className="px-3 py-2 text-center font-bold">After</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d, i) => (
                  <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-muted-foreground">{d.sNo}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate" title={d.concern}>{d.concern}</td>
                    <td className="px-3 py-2 font-semibold">{d.field}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded font-mono">{d.before}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ArrowRight className="w-3 h-3 mx-auto text-muted-foreground" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-success/10 text-success px-2 py-0.5 rounded font-mono">{d.after}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {isApplied && diffs.length > 0 && (
          <div className="flex justify-between items-center pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{diffs.length} fields updated across {new Set(diffs.map(d => d.sNo)).size} concerns</p>
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={onUndo}>
              <Undo2 className="w-4 h-4" />
              Undo All Changes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpdateDiffDialog;
