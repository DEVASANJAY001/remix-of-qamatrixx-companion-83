import { QAMatrixEntry } from "@/types/qaMatrix";
import StatusBadge from "./StatusBadge";
import { ChevronDown, ChevronUp, X, Trash2, Pencil, Check } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QAMatrixTableProps {
  data: QAMatrixEntry[];
  filter: { rating?: 1 | 3 | 5; level?: string; status?: "OK" | "NG" } | null;
  onClearFilter: () => void;
  onWeeklyUpdate: (sNo: number, weekIndex: number, value: number) => void;
  onScoreUpdate?: (sNo: number, section: "trim" | "chassis" | "final" | "qControl" | "qControlDetail", key: string, value: number | null) => void;
  onFieldUpdate?: (sNo: number, field: string, value: string) => void;
  onDeleteEntry?: (sNo: number) => void;
}

const weekLabels = ["W-6","W-5","W-4","W-3","W-2","W-1"];
const trimKeys = ["T10","T20","T30","T40","T50","T60","T70","T80","T90","T100","TPQG"] as const;
const chassisKeys = ["C10","C20","C30","C40","C45","P10","P20","P30","C50","C60","C70","RSub","TS","C80","CPQG"] as const;
const finalKeysDisplay = ["F10","F20","F30","F40","F50","F60","F70","F80","F90","F100","FPQG"] as const;

const qControlLabels = [
  { key: "freqControl_1_1" as const, label: "1.1", short: "Freq Ctrl", title: "Frequency Control" },
  { key: "visualControl_1_2" as const, label: "1.2", short: "Visual Ctrl", title: "Visual Control" },
  { key: "periodicAudit_1_3" as const, label: "1.3", short: "Periodic Audit", title: "Periodic audit Process monitoring" },
  { key: "humanControl_1_4" as const, label: "1.4", short: "Human Ctrl", title: "100% Human Control without tracking" },
  { key: "saeAlert_3_1" as const, label: "3.1", short: "SAE Alert", title: "SAE (Error Proofing) alert" },
  { key: "freqMeasure_3_2" as const, label: "3.2", short: "Freq Measure", title: "Frequency control (Measurements)" },
  { key: "manualTool_3_3" as const, label: "3.3", short: "Manual Tool", title: "100% Manual control in the line with tool" },
  { key: "humanTracking_3_4" as const, label: "3.4", short: "Human Track", title: "100% human control with tracking" },
  { key: "autoControl_5_1" as const, label: "5.1", short: "Auto Ctrl", title: "100% automatic control" },
  { key: "impossibility_5_2" as const, label: "5.2", short: "Impossibility", title: "Impossibility of assembly or subsequent machining" },
  { key: "saeProhibition_5_3" as const, label: "5.3", short: "SAE Prohib", title: "SAE (Error proofing) Prohibition" },
];

const qControlDetailKeys = [
  { key: "CVT" as const, label: "CVT" },
  { key: "SHOWER" as const, label: "SHOWER" },
  { key: "DynamicUB" as const, label: "Dynamic/ UB" },
  { key: "CC4" as const, label: "CC4" },
];

const ScoreInput = ({ value, onChange, defectRating }: { value: number | null; onChange: (v: number | null) => void; defectRating: number }) => (
  <input
    type="number"
    min={0}
    max={99}
    value={value ?? ""}
    onChange={(e) => {
      const raw = e.target.value;
      onChange(raw === "" ? null : Math.max(0, parseInt(raw) || 0));
    }}
    onClick={(e) => e.stopPropagation()}
    className={`w-full text-center font-mono text-xs py-1 rounded border-0 focus:ring-1 focus:ring-primary outline-none ${
      value !== null && value >= defectRating ? "text-emerald-600 font-semibold bg-emerald-500/5" :
      value !== null ? "text-foreground bg-transparent" : "bg-transparent text-muted-foreground/30"
    }`}
    style={{ minWidth: 28 }}
  />
);

const QAMatrixTable = ({ data, filter, onClearFilter, onWeeklyUpdate, onScoreUpdate, onFieldUpdate, onDeleteEntry }: QAMatrixTableProps) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});

  const filteredData = filter
    ? data.filter((d) => {
        if (!filter.rating) return true;
        if (d.defectRating !== filter.rating) return false;
        if (filter.status) {
          if (filter.level === "Workstation") return d.workstationStatus === filter.status;
          if (filter.level === "MFG") return d.mfgStatus === filter.status;
          if (filter.level === "Plant") return d.plantStatus === filter.status;
        }
        return true;
      })
    : data;

  return (
    <TooltipProvider>
    <div className="space-y-3">
      {filter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg">
          <span className="text-sm text-primary">
            Showing Rating {filter.rating} — {filter.level} {filter.status ?? "All"} items ({filteredData.length} results)
          </span>
          <button onClick={onClearFilter} className="ml-auto p-1 hover:bg-primary/20 rounded">
            <X className="w-4 h-4 text-primary" />
          </button>
        </div>
      )}

      <div className="overflow-auto border border-border rounded-lg bg-card" style={{ maxHeight: "calc(100vh - 120px)" }}>
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-muted border-b border-border">
              <th rowSpan={2} className="sticky left-0 z-30 bg-muted px-2 py-2 text-left text-[10px] font-bold min-w-[40px] border-r border-border/40">#</th>
              <th rowSpan={2} className="px-2 py-2 text-left text-[10px] font-bold min-w-[50px]">Src</th>
              <th rowSpan={2} className="px-2 py-2 text-left text-[10px] font-bold min-w-[55px]">Stn</th>
              <th rowSpan={2} className="px-2 py-2 text-left text-[10px] font-bold min-w-[60px]">Area</th>
              <th rowSpan={2} className="px-2 py-2 text-left text-[10px] font-bold min-w-[200px]">Concern</th>
              <th rowSpan={2} className="px-2 py-2 text-center text-[10px] font-bold min-w-[30px]">DR</th>
              <th colSpan={6} className="px-1 py-1.5 text-center text-[10px] font-bold border-l-2 border-amber-400/60 bg-amber-50 text-amber-700">RECURRENCE</th>
              <th rowSpan={2} className="px-2 py-2 text-center text-[10px] font-bold min-w-[40px]">RC+DR</th>
              <th colSpan={11} className="px-1 py-1.5 text-center text-[10px] font-bold border-l-2 border-sky-400/60 bg-sky-50 text-sky-700">TRIM</th>
              <th colSpan={15} className="px-1 py-1.5 text-center text-[10px] font-bold border-l-2 border-emerald-400/60 bg-emerald-50 text-emerald-700">CHASSIS</th>
              <th colSpan={11} className="px-1 py-1.5 text-center text-[10px] font-bold border-l-2 border-violet-400/60 bg-violet-50 text-violet-700">FINAL</th>
              <th rowSpan={2} className="px-1 py-1.5 text-center text-[10px] font-bold border-l-2 border-rose-400/60 bg-rose-50 text-rose-700 min-w-[45px]" title="Residual Torque">Res. Torque</th>
              {qControlLabels.map((q, i) => (
                <th key={q.key} className={`px-1 py-1.5 text-center text-[10px] font-bold bg-orange-50 text-orange-700 min-w-[30px] ${i === 0 ? "border-l-2 border-orange-400/60" : "border-l border-border/20"}`}>{q.label}</th>
              ))}
              <th colSpan={4} className="px-1 py-1.5 text-center text-[10px] font-bold border-l-2 border-teal-400/60 bg-teal-50 text-teal-700">Q' CONTROL</th>
              <th colSpan={3} className="px-1 py-1.5 text-center text-[10px] font-bold border-l-2 border-primary/40 bg-muted text-primary">CONTROL RATING</th>
              <th colSpan={3} className="px-1 py-1.5 text-center text-[10px] font-bold border-l-2 border-primary/40 bg-muted text-primary">GUARANTEED QUALITY LEVEL</th>
              <th rowSpan={2} className="px-1 py-2 min-w-[60px] text-[10px] font-bold">Actions</th>
            </tr>
            <tr className="bg-muted border-b border-border">
              {weekLabels.map(w => (
                <th key={w} className="px-1 py-1 text-center text-[9px] font-semibold min-w-[32px] border-l border-border/30 bg-amber-50">{w}</th>
              ))}
              {trimKeys.map(k => (
                <th key={k} className="px-1 py-1 text-center text-[9px] font-semibold min-w-[30px] border-l border-border">{k}</th>
              ))}
              {chassisKeys.map(k => (
                <th key={k} className="px-1 py-1 text-center text-[9px] font-semibold min-w-[30px] border-l border-border">{k}</th>
              ))}
              {finalKeysDisplay.map(k => (
                <th key={k} className="px-1 py-1 text-center text-[9px] font-semibold min-w-[30px] border-l border-border">{k}</th>
              ))}
              {qControlLabels.map(q => (
                <th key={q.key} className="px-1 py-1 text-[8px] font-semibold min-w-[30px] border-l border-border bg-orange-50 cursor-pointer" style={{ writingMode: "vertical-rl", textOrientation: "mixed", whiteSpace: "nowrap", height: 80 }}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="select-none">{q.short}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                      <p className="font-bold">{q.label}</p>
                      <p>{q.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </th>
              ))}
              {qControlDetailKeys.map(q => (
                <th key={q.key} className="px-1 py-1 text-center text-[9px] font-semibold min-w-[30px] border-l border-border">{q.label}</th>
              ))}
              <th className="px-1 py-1 text-center text-[9px] font-semibold min-w-[35px] border-l border-primary/30">MFG</th>
              <th className="px-1 py-1 text-center text-[9px] font-semibold min-w-[35px]">Qty</th>
              <th className="px-1 py-1 text-center text-[9px] font-semibold min-w-[35px]">Plnt</th>
              <th className="px-1 py-1 text-center text-[9px] font-semibold min-w-[40px] border-l border-primary/30">WS</th>
              <th className="px-1 py-1 text-center text-[9px] font-semibold min-w-[40px]">MFG</th>
              <th className="px-1 py-1 text-center text-[9px] font-semibold min-w-[40px]">Plnt</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((entry) => (
              <>
                <tr
                  key={entry.sNo}
                  className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === entry.sNo ? null : entry.sNo)}
                >
                  <td className="sticky left-0 z-10 bg-card px-2 py-1.5 font-mono text-muted-foreground text-center border-r border-border">{entry.sNo}</td>
                  <td className="px-2 py-1.5">{entry.source}</td>
                  <td className="px-2 py-1.5 font-mono text-primary">{entry.operationStation}</td>
                  <td className="px-2 py-1.5">{entry.designation}</td>
                  <td className="px-2 py-1.5 max-w-[220px] truncate" title={entry.concern}>{entry.concern}</td>
                  <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={entry.defectRating}
                      onChange={(e) => {
                        const newRating = Number(e.target.value) as 1 | 3 | 5;
                        onFieldUpdate?.(entry.sNo, "defectRating", String(newRating));
                      }}
                      className={`w-8 h-6 text-center font-bold text-[10px] rounded-full border-0 cursor-pointer appearance-none focus:ring-1 focus:ring-primary outline-none ${
                        entry.defectRating === 5 ? "bg-destructive/15 text-destructive" :
                        entry.defectRating === 3 ? "bg-warning/15 text-warning" :
                        "bg-primary/15 text-primary"
                      }`}
                    >
                      <option value={1}>1</option>
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                    </select>
                  </td>
                  {entry.weeklyRecurrence.map((val, i) => (
                    <td key={`w${i}`} className="px-0.5 py-0.5 border-l border-border bg-amber-50/10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={val}
                        onChange={(e) => onWeeklyUpdate(entry.sNo, i, Math.max(0, parseInt(e.target.value) || 0))}
                        className={`w-full text-center font-mono text-xs py-1 rounded border-0 focus:ring-1 focus:ring-primary outline-none ${
                          val > 0 ? "bg-destructive/10 text-destructive font-bold" : "bg-transparent text-muted-foreground"
                        }`}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center font-bold font-mono">{entry.recurrenceCountPlusDefect}</td>
                  {trimKeys.map(k => (
                    <td key={k} className="px-0.5 py-0.5 border-l border-border">
                      <ScoreInput value={entry.trim[k]} defectRating={entry.defectRating} onChange={(v) => onScoreUpdate?.(entry.sNo, "trim", k, v)} />
                    </td>
                  ))}
                  {chassisKeys.map(k => (
                    <td key={k} className="px-0.5 py-0.5 border-l border-border">
                      <ScoreInput value={entry.chassis[k]} defectRating={entry.defectRating} onChange={(v) => onScoreUpdate?.(entry.sNo, "chassis", k, v)} />
                    </td>
                  ))}
                  {finalKeysDisplay.map(k => (
                    <td key={k} className="px-0.5 py-0.5 border-l border-border">
                      <ScoreInput value={entry.final[k]} defectRating={entry.defectRating} onChange={(v) => onScoreUpdate?.(entry.sNo, "final", k, v)} />
                    </td>
                  ))}
                  <td className="px-0.5 py-0.5 border-l-2 border-rose-400">
                    <ScoreInput value={entry.final.ResidualTorque} defectRating={entry.defectRating} onChange={(v) => onScoreUpdate?.(entry.sNo, "final", "ResidualTorque", v)} />
                  </td>
                  {qControlLabels.map(q => (
                    <td key={q.key} className="px-0.5 py-0.5 border-l border-border">
                      <ScoreInput value={entry.qControl[q.key]} defectRating={entry.defectRating} onChange={(v) => onScoreUpdate?.(entry.sNo, "qControl", q.key, v)} />
                    </td>
                  ))}
                  {qControlDetailKeys.map(q => (
                    <td key={q.key} className="px-0.5 py-0.5 border-l border-border">
                      <ScoreInput value={entry.qControlDetail[q.key]} defectRating={entry.defectRating} onChange={(v) => onScoreUpdate?.(entry.sNo, "qControlDetail", q.key, v)} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center border-l border-border font-bold font-mono">{entry.controlRating.MFG}</td>
                  <td className="px-2 py-1.5 text-center font-mono">{entry.controlRating.Quality}</td>
                  <td className="px-2 py-1.5 text-center font-bold font-mono">{entry.controlRating.Plant}</td>
                  <td className="px-1 py-1.5 text-center border-l border-primary/30"><StatusBadge status={entry.workstationStatus} /></td>
                  <td className="px-1 py-1.5 text-center"><StatusBadge status={entry.mfgStatus} /></td>
                  <td className="px-1 py-1.5 text-center"><StatusBadge status={entry.plantStatus} /></td>
                  <td className="px-1 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5 justify-center">
                      {editingRow === entry.sNo ? (
                        <button onClick={() => { Object.entries(editFields).forEach(([field, value]) => { onFieldUpdate?.(entry.sNo, field, value); }); setEditingRow(null); setEditFields({}); }} className="p-1 rounded hover:bg-primary/10 text-primary" title="Save"><Check className="w-3.5 h-3.5" /></button>
                      ) : (
                        <button onClick={() => { setEditingRow(entry.sNo); setEditFields({ source: entry.source, operationStation: entry.operationStation, designation: entry.designation, concern: entry.concern, mfgAction: entry.mfgAction, resp: entry.resp, target: entry.target }); }} className="p-1 rounded hover:bg-primary/10 text-muted-foreground" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => { if (confirm(`Delete concern #${entry.sNo}?`)) { onDeleteEntry?.(entry.sNo); } }} className="p-1 rounded hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setExpandedRow(expandedRow === entry.sNo ? null : entry.sNo)} className="p-1 rounded hover:bg-muted">
                        {expandedRow === entry.sNo ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRow === entry.sNo && (
                  <tr key={`exp-${entry.sNo}`} className="bg-muted/20">
                    <td colSpan={100} className="px-4 py-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-2">
                          <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">Concern Details</p>
                          {editingRow === entry.sNo ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-[10px] text-muted-foreground">Concern</label>
                                <input value={editFields.concern ?? ""} onChange={(e) => setEditFields(f => ({ ...f, concern: e.target.value }))} className="w-full px-2 py-1 text-xs border border-input rounded bg-background" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] text-muted-foreground">Source</label>
                                  <input value={editFields.source ?? ""} onChange={(e) => setEditFields(f => ({ ...f, source: e.target.value }))} className="w-full px-2 py-1 text-xs border border-input rounded bg-background" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] text-muted-foreground">Station</label>
                                  <input value={editFields.operationStation ?? ""} onChange={(e) => setEditFields(f => ({ ...f, operationStation: e.target.value }))} className="w-full px-2 py-1 text-xs border border-input rounded bg-background" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-foreground">{entry.concern}</p>
                              <p className="mt-2"><span className="text-muted-foreground">Station:</span> {entry.operationStation} — {entry.designation}</p>
                              <p><span className="text-muted-foreground">Source:</span> {entry.source}</p>
                            </>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">Weekly Recurrence</p>
                          <div className="flex gap-1">
                            {weekLabels.map((w, i) => (
                              <div key={w} className={`px-2 py-1 rounded text-center ${entry.weeklyRecurrence[i] > 0 ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
                                <p className="text-[9px]">{w}</p>
                                <p className="font-mono font-bold">{entry.weeklyRecurrence[i]}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">Action & Responsibility</p>
                          {editingRow === entry.sNo ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-[10px] text-muted-foreground">MFG Action</label>
                                <input value={editFields.mfgAction ?? ""} onChange={(e) => setEditFields(f => ({ ...f, mfgAction: e.target.value }))} className="w-full px-2 py-1 text-xs border border-input rounded bg-background" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] text-muted-foreground">Responsible</label>
                                  <input value={editFields.resp ?? ""} onChange={(e) => setEditFields(f => ({ ...f, resp: e.target.value }))} className="w-full px-2 py-1 text-xs border border-input rounded bg-background" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] text-muted-foreground">Target</label>
                                  <input value={editFields.target ?? ""} onChange={(e) => setEditFields(f => ({ ...f, target: e.target.value }))} className="w-full px-2 py-1 text-xs border border-input rounded bg-background" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-foreground">{entry.mfgAction || "—"}</p>
                              <p className="mt-2"><span className="text-muted-foreground">Resp:</span> {entry.resp}</p>
                              <p><span className="text-muted-foreground">Target:</span> {entry.target || "—"}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default QAMatrixTable;
