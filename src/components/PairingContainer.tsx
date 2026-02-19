import { useState, useMemo } from "react";
import { QAMatrixEntry } from "@/types/qaMatrix";
import { MatchedRepeat, UnmatchedDefect, DVXEntry } from "@/types/dvxReport";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trash2, Edit2, ChevronDown, ChevronUp, Link2, Unlink } from "lucide-react";

interface PairingContainerProps {
  matched: MatchedRepeat[];
  unmatched: UnmatchedDefect[];
  qaData: QAMatrixEntry[];
  onUnpair: (qaSNo: number, dvxIdx: number) => void;
  onReassign: (dvxEntry: DVXEntry, fromSNo: number, toSNo: number) => void;
  onManualPair: (unmatchedId: string, qaSNo: number) => void;
}

const PairingContainer = ({
  matched, unmatched, qaData, onUnpair, onReassign, onManualPair,
}: PairingContainerProps) => {
  const [expandedPair, setExpandedPair] = useState<number | null>(null);
  const [reassigningSNo, setReassigningSNo] = useState<{ sNo: number; dvxIdx: number } | null>(null);
  const [reassignTarget, setReassignTarget] = useState("");

  const qaOptions = useMemo(() =>
    qaData.map(q => ({ sNo: q.sNo, label: `#${q.sNo} - ${q.concern.substring(0, 60)}` })),
    [qaData]
  );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center gap-2">
        <Link2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold">Issue ↔ Concern Pairing Map</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {matched.length} paired groups · {matched.reduce((a, m) => a + m.dvxEntries.length, 0)} defects matched
        </span>
      </div>

      <div className="overflow-auto" style={{ maxHeight: 500 }}>
        {matched.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No pairings yet. Upload a report to see matched concerns.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {matched.map((m) => {
              const qaEntry = qaData.find(q => q.sNo === m.qaSNo);
              const isExpanded = expandedPair === m.qaSNo;
              return (
                <div key={m.qaSNo} className="group">
                  <div
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setExpandedPair(isExpanded ? null : m.qaSNo)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          QA #{m.qaSNo}
                        </span>
                        <span className="text-xs font-semibold truncate">{m.qaConcern}</span>
                      </div>
                      {qaEntry && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {qaEntry.source} · {qaEntry.operationStation} · {qaEntry.designation}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                        {m.dvxEntries.length} defects · {m.repeatCount} repeats
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Score: {(m.matchScore * 100).toFixed(0)}%
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-1.5 bg-muted/10">
                      {m.dvxEntries.map((dvx, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded border border-border/50 bg-card text-xs">
                          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold">{dvx.defectDescription}</span>
                            {dvx.defectDescriptionDetails && (
                              <span className="text-muted-foreground"> — {dvx.defectDescriptionDetails}</span>
                            )}
                            <span className="text-muted-foreground ml-2">({dvx.locationDetails})</span>
                          </div>
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Qty: {dvx.quantity}</span>

                          {reassigningSNo?.sNo === m.qaSNo && reassigningSNo?.dvxIdx === idx ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <select
                                value={reassignTarget}
                                onChange={e => setReassignTarget(e.target.value)}
                                className="text-[10px] px-1 py-0.5 border border-input rounded bg-background max-w-[180px]"
                              >
                                <option value="">Select concern...</option>
                                {qaOptions.filter(o => o.sNo !== m.qaSNo).map(o => (
                                  <option key={o.sNo} value={o.sNo}>{o.label}</option>
                                ))}
                              </select>
                              <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]"
                                onClick={() => {
                                  if (reassignTarget) onReassign(dvx, m.qaSNo, Number(reassignTarget));
                                  setReassigningSNo(null);
                                  setReassignTarget("");
                                }}>OK</Button>
                              <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]"
                                onClick={() => { setReassigningSNo(null); setReassignTarget(""); }}>✕</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => { setReassigningSNo({ sNo: m.qaSNo, dvxIdx: idx }); setReassignTarget(""); }}
                                className="p-1 rounded hover:bg-primary/10 text-muted-foreground"
                                title="Reassign to different concern"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onUnpair(m.qaSNo, idx)}
                                className="p-1 rounded hover:bg-destructive/10 text-destructive"
                                title="Unpair this defect"
                              >
                                <Unlink className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PairingContainer;
