import { useState, useRef, useMemo } from "react";
import { QAMatrixEntry } from "@/types/qaMatrix";
import { DVXEntry, MatchedRepeat, UnmatchedDefect } from "@/types/dvxReport";
import { parseDVXSheet } from "@/utils/dvxParser";
import { recalculateStatuses } from "@/utils/qaCalculations";
import { exportToXLSX } from "@/utils/xlsxExport";
import Dashboard from "@/components/Dashboard";
import QAMatrixTable from "@/components/QAMatrixTable";
import PairingContainer from "@/components/PairingContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Plus, AlertTriangle, CheckCircle, X, Search, Filter, FileSpreadsheet, ArrowUpCircle, Link2 } from "lucide-react";
import * as XLSX from "xlsx";

interface RepeatsTabProps {
  qaData: QAMatrixEntry[];
  dvxEntries: DVXEntry[];
  fileName: string;
  matched: MatchedRepeat[];
  unmatched: UnmatchedDefect[];
  addedIds: Set<string>;
  onFileUpload: (entries: DVXEntry[], fileName: string) => void;
  onAddToQAMatrix: (entry: QAMatrixEntry) => void;
  onClear: () => void;
  onSetAddedIds: (ids: Set<string>) => void;
  onWeeklyUpdate: (sNo: number, weekIndex: number, value: number) => void;
  onScoreUpdate: (sNo: number, section: "trim" | "chassis" | "final" | "qControl" | "qControlDetail", key: string, value: number | null) => void;
  onFieldUpdate: (sNo: number, field: string, value: string) => void;
  onDeleteEntry: (sNo: number) => void;
  onDashboardFilter: (filterType: string, filterValue: string) => void;
  onApplyToMatrix: () => void;
  onUnpair: (qaSNo: number, dvxIdx: number) => void;
  onReassign: (dvxEntry: DVXEntry, fromSNo: number, toSNo: number) => void;
  onManualPair: (unmatchedId: string, qaSNo: number) => void;
  isApplied: boolean;
}

const RepeatsTab = ({
  qaData, dvxEntries, fileName, matched, unmatched, addedIds,
  onFileUpload, onAddToQAMatrix, onClear, onSetAddedIds,
  onWeeklyUpdate, onScoreUpdate, onFieldUpdate, onDeleteEntry, onDashboardFilter,
  onApplyToMatrix, onUnpair, onReassign, onManualPair, isApplied,
}: RepeatsTabProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUnmatched, setSelectedUnmatched] = useState<UnmatchedDefect | null>(null);
  const [pairMode, setPairMode] = useState<"new" | "existing">("existing");
  const [selectedPairSNo, setSelectedPairSNo] = useState<string>("");

  // Add concern form state
  const [formSource, setFormSource] = useState("");
  const [formStation, setFormStation] = useState("");
  const [formDesignation, setFormDesignation] = useState("Trim");
  const [formRating, setFormRating] = useState<1 | 3 | 5>(1);
  const [formConcern, setFormConcern] = useState("");
  const [formAction, setFormAction] = useState("");
  const [formResp, setFormResp] = useState("");
  const [formTarget, setFormTarget] = useState("");

  // Filters for matched QA table
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const entries = parseDVXSheet(sheet);
      onFileUpload(entries, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClear = () => {
    onClear();
    if (fileRef.current) fileRef.current.value = "";
  };

  const openAddDialog = (item: UnmatchedDefect) => {
    setSelectedUnmatched(item);
    setPairMode("existing");
    setSelectedPairSNo("");
    const dvx = item.dvxEntry;
    setFormSource(dvx.source || "");
    setFormStation(dvx.locationDetails || "");
    setFormDesignation(dvx.pofCode || "Trim");
    setFormRating(dvx.gravity === "A" ? 5 : dvx.gravity === "B" ? 3 : 1);
    setFormConcern(`${dvx.defectDescription} - ${dvx.defectDescriptionDetails}`.trim().replace(/ - $/, ""));
    setFormAction("");
    setFormResp(dvx.responsible || "");
    setFormTarget("");
    setAddDialogOpen(true);
  };

  const handlePairExisting = () => {
    if (!selectedUnmatched || !selectedPairSNo) return;
    onManualPair(selectedUnmatched.id, Number(selectedPairSNo));
    onSetAddedIds(new Set(addedIds).add(selectedUnmatched.id));
    setAddDialogOpen(false);
    setSelectedUnmatched(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnmatched || !formConcern) return;

    const nextSNo = qaData.length > 0 ? Math.max(...qaData.map(q => q.sNo)) + 1 : 1;
    const n = null;
    const newEntry: QAMatrixEntry = {
      sNo: nextSNo,
      source: formSource,
      operationStation: formStation,
      designation: formDesignation,
      concern: formConcern,
      defectRating: formRating,
      recurrence: selectedUnmatched.dvxEntry.quantity,
      weeklyRecurrence: [0, 0, 0, 0, 0, selectedUnmatched.dvxEntry.quantity],
      recurrenceCountPlusDefect: 0,
      trim: { T10: n, T20: n, T30: n, T40: n, T50: n, T60: n, T70: n, T80: n, T90: n, T100: n, TPQG: n },
      chassis: { C10: n, C20: n, C30: n, C40: n, C45: n, P10: n, P20: n, P30: n, C50: n, C60: n, C70: n, RSub: n, TS: n, C80: n, CPQG: n },
      final: { F10: n, F20: n, F30: n, F40: n, F50: n, F60: n, F70: n, F80: n, F90: n, F100: n, FPQG: n, ResidualTorque: n },
      qControl: { freqControl_1_1: n, visualControl_1_2: n, periodicAudit_1_3: n, humanControl_1_4: n, saeAlert_3_1: n, freqMeasure_3_2: n, manualTool_3_3: n, humanTracking_3_4: n, autoControl_5_1: n, impossibility_5_2: n, saeProhibition_5_3: n },
      qControlDetail: { CVT: n, SHOWER: n, DynamicUB: n, CC4: n },
      controlRating: { MFG: 0, Quality: 0, Plant: 0 },
      guaranteedQuality: { Workstation: n, MFG: n, Plant: n },
      workstationStatus: "NG",
      mfgStatus: "NG",
      plantStatus: "NG",
      mfgAction: formAction,
      resp: formResp,
      target: formTarget,
    };

    onAddToQAMatrix(recalculateStatuses(newEntry));
    onSetAddedIds(new Set(addedIds).add(selectedUnmatched.id));
    setAddDialogOpen(false);
    setSelectedUnmatched(null);
  };

  // Get matched QA entries for the table
  const matchedSNos = useMemo(() => new Set(matched.map(m => m.qaSNo)), [matched]);
  const matchedQAData = useMemo(() => qaData.filter(q => matchedSNos.has(q.sNo)), [qaData, matchedSNos]);

  // Filtered matched data
  const sources = useMemo(() => [...new Set(qaData.map(d => d.source))].sort(), [qaData]);
  const designations = useMemo(() => [...new Set(qaData.map(d => d.designation.toUpperCase()))].sort(), [qaData]);

  const filteredMatchedData = useMemo(() => {
    let result = matchedQAData;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d => d.concern.toLowerCase().includes(term) || d.operationStation.toLowerCase().includes(term) || d.sNo.toString().includes(term));
    }
    if (sourceFilter) result = result.filter(d => d.source.toUpperCase() === sourceFilter.toUpperCase());
    if (designationFilter) result = result.filter(d => d.designation.toUpperCase() === designationFilter.toUpperCase());
    if (ratingFilter) result = result.filter(d => d.defectRating === Number(ratingFilter));
    if (statusFilter === "NG") result = result.filter(d => d.workstationStatus === "NG" || d.mfgStatus === "NG" || d.plantStatus === "NG");
    if (statusFilter === "OK") result = result.filter(d => d.workstationStatus === "OK" && d.mfgStatus === "OK" && d.plantStatus === "OK");
    return result;
  }, [matchedQAData, searchTerm, sourceFilter, designationFilter, ratingFilter, statusFilter]);

  const hasActiveFilters = sourceFilter || designationFilter || statusFilter || ratingFilter || searchTerm;
  const clearAllFilters = () => { setSearchTerm(""); setSourceFilter(""); setDesignationFilter(""); setStatusFilter(""); setRatingFilter(""); };

  const activeUnmatched = unmatched.filter(u => !addedIds.has(u.id));

  // QA options for manual pairing dropdown - sorted by relevance
  const qaOptions = useMemo(() =>
    qaData.map(q => ({ sNo: q.sNo, label: `#${q.sNo} - ${q.concern.substring(0, 50)} (${q.operationStation})` })),
    [qaData]
  );

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-bold">Upload Repeat Issues Report</h2>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
            className="block flex-1 text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
          />
          {fileName && (
            <>
              <span className="text-xs text-muted-foreground">
                {fileName} — {dvxEntries.length} defects parsed
              </span>
              <Button size="sm" variant="ghost" onClick={handleClear} className="text-destructive">
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {dvxEntries.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="dashboard-card flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/15">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{dvxEntries.length}</p>
                <p className="text-xs text-muted-foreground">Total Defects Uploaded</p>
              </div>
            </div>
            <div className="dashboard-card flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-success/15">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{matched.length}</p>
                <p className="text-xs text-muted-foreground">Matched ({matched.reduce((a, m) => a + m.repeatCount, 0)} repeats)</p>
              </div>
            </div>
            <div className="dashboard-card flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-warning/15">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{activeUnmatched.length}</p>
                <p className="text-xs text-muted-foreground">Not Paired</p>
              </div>
            </div>
          </div>

          {/* Pairing Container - Feature 2 */}
          <PairingContainer
            matched={matched}
            unmatched={activeUnmatched}
            qaData={qaData}
            onUnpair={onUnpair}
            onReassign={onReassign}
            onManualPair={onManualPair}
          />

          {/* Dashboard for matched concerns */}
          {matchedQAData.length > 0 && (
            <>
              <Dashboard data={matchedQAData} onFilterByCategory={(type, value) => {
                if (type === "designation") setDesignationFilter(value);
                else if (type === "source") setSourceFilter(value);
              }} />

              {/* Action buttons bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportToXLSX(matchedQAData, "repeat-matched-export.xlsx")}>
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Matched (Excel)
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 ml-auto"
                  variant={isApplied ? "outline" : "default"}
                  onClick={onApplyToMatrix}
                  disabled={isApplied}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  {isApplied ? "Applied to QA Matrix ✓" : "Apply to QA Matrix"}
                </Button>
              </div>

              {/* Filters */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Filters</span>
                  {hasActiveFilters && (
                    <button onClick={clearAllFilters} className="ml-auto text-xs text-destructive hover:underline flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear all
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" placeholder="Search concerns, stations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="px-3 py-2 text-sm border border-input rounded-md bg-background">
                    <option value="">All Sources</option>
                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)} className="px-3 py-2 text-sm border border-input rounded-md bg-background">
                    <option value="">All Areas</option>
                    {designations.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="px-3 py-2 text-sm border border-input rounded-md bg-background">
                    <option value="">All Ratings</option>
                    <option value="1">Rating 1</option>
                    <option value="3">Rating 3</option>
                    <option value="5">Rating 5</option>
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-input rounded-md bg-background">
                    <option value="">All Status</option>
                    <option value="NG">Has NG</option>
                    <option value="OK">All OK</option>
                  </select>
                </div>
                {hasActiveFilters && (
                  <p className="text-xs text-muted-foreground">Showing {filteredMatchedData.length} of {matchedQAData.length} matched concerns</p>
                )}
              </div>

              {/* Matched QA Matrix Table */}
              <div>
                <h2 className="section-header mb-3">Matched Concerns — QA Matrix Details</h2>
                <QAMatrixTable
                  data={filteredMatchedData}
                  filter={null}
                  onClearFilter={() => {}}
                  onWeeklyUpdate={onWeeklyUpdate}
                  onScoreUpdate={onScoreUpdate}
                  onFieldUpdate={onFieldUpdate}
                  onDeleteEntry={onDeleteEntry}
                />
              </div>
            </>
          )}

          {/* Unmatched / Not Paired - Feature 5: manual pairing */}
          {activeUnmatched.length > 0 && (
            <div className="bg-card border border-warning/30 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-warning/5 border-b border-warning/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-bold">Not Paired Concerns</h3>
                <span className="ml-auto text-xs text-muted-foreground">{activeUnmatched.length} defects not matched</span>
              </div>
              <div className="overflow-auto" style={{ maxHeight: 400 }}>
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">Location</th>
                      <th className="px-3 py-2 text-left font-bold">Defect Code</th>
                      <th className="px-3 py-2 text-left font-bold">Description</th>
                      <th className="px-3 py-2 text-left font-bold">Details</th>
                      <th className="px-3 py-2 text-center font-bold">Gravity</th>
                      <th className="px-3 py-2 text-center font-bold">Qty</th>
                      <th className="px-3 py-2 text-left font-bold">Source</th>
                      <th className="px-3 py-2 text-center font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUnmatched.map((item) => (
                      <tr key={item.id} className="border-t border-border/30 hover:bg-muted/20">
                        <td className="px-3 py-2 max-w-[150px] truncate" title={item.dvxEntry.locationDetails}>{item.dvxEntry.locationDetails}</td>
                        <td className="px-3 py-2 font-mono">{item.dvxEntry.defectCode}</td>
                        <td className="px-3 py-2 max-w-[180px] truncate" title={item.dvxEntry.defectDescription}>{item.dvxEntry.defectDescription}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate" title={item.dvxEntry.defectDescriptionDetails}>{item.dvxEntry.defectDescriptionDetails}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.dvxEntry.gravity === "A" ? "bg-destructive/15 text-destructive" :
                            item.dvxEntry.gravity === "B" ? "bg-warning/15 text-warning" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {item.dvxEntry.gravity || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">{item.dvxEntry.quantity}</td>
                        <td className="px-3 py-2">{item.dvxEntry.source}</td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] gap-1 px-2"
                            onClick={() => openAddDialog(item)}
                          >
                            <Link2 className="w-3 h-3" />
                            Pair / Add
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {dvxEntries.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Upload a repeat issues report to match defects against QA Matrix concerns</p>
          <p className="text-xs mt-1">Supports CSV, XLSX, and XLS files</p>
        </div>
      )}

      {/* Pair / Add Dialog - Feature 5 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pair or Add Concern</DialogTitle>
          </DialogHeader>

          {selectedUnmatched && (
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 text-xs space-y-1 mb-2">
              <p className="font-bold text-warning text-sm">Defect to be paired:</p>
              <p><span className="text-muted-foreground">Location:</span> {selectedUnmatched.dvxEntry.locationDetails}</p>
              <p><span className="text-muted-foreground">Code:</span> {selectedUnmatched.dvxEntry.defectCode}</p>
              <p><span className="text-muted-foreground">Description:</span> {selectedUnmatched.dvxEntry.defectDescription}</p>
              <p><span className="text-muted-foreground">Details:</span> {selectedUnmatched.dvxEntry.defectDescriptionDetails}</p>
              <p><span className="text-muted-foreground">Gravity:</span> {selectedUnmatched.dvxEntry.gravity} | <span className="text-muted-foreground">Qty:</span> {selectedUnmatched.dvxEntry.quantity}</p>
            </div>
          )}

          {/* Toggle: pair to existing or create new */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 mb-3">
            <button
              type="button"
              onClick={() => setPairMode("existing")}
              className={`flex-1 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                pairMode === "existing" ? "bg-card shadow text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pair to Existing Concern
            </button>
            <button
              type="button"
              onClick={() => setPairMode("new")}
              className={`flex-1 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                pairMode === "new" ? "bg-card shadow text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create New Concern
            </button>
          </div>

          {pairMode === "existing" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Select QA Matrix Concern</Label>
                <select
                  value={selectedPairSNo}
                  onChange={(e) => setSelectedPairSNo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                >
                  <option value="">-- Select a concern --</option>
                  {qaOptions.map(o => (
                    <option key={o.sNo} value={o.sNo}>{o.label}</option>
                  ))}
                </select>
              </div>
              {selectedPairSNo && (
                <div className="bg-primary/5 border border-primary/20 rounded p-3 text-xs">
                  {(() => {
                    const qa = qaData.find(q => q.sNo === Number(selectedPairSNo));
                    if (!qa) return null;
                    return (
                      <>
                        <p className="font-bold text-primary">Will pair to:</p>
                        <p>#{qa.sNo} — {qa.concern}</p>
                        <p className="text-muted-foreground">{qa.source} · {qa.operationStation} · {qa.designation}</p>
                      </>
                    );
                  })()}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handlePairExisting} disabled={!selectedPairSNo}>
                  <Link2 className="w-4 h-4 mr-1" /> Pair Defect
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-source">Source *</Label>
                  <Input id="r-source" value={formSource} onChange={(e) => setFormSource(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-station">Station *</Label>
                  <Input id="r-station" value={formStation} onChange={(e) => setFormStation(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-area">Area</Label>
                  <select id="r-area" value={formDesignation} onChange={(e) => setFormDesignation(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background">
                    <option value="Trim">Trim</option>
                    <option value="Chassis">Chassis</option>
                    <option value="Final">Final</option>
                    <option value="TRIM">TRIM</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-rating">Defect Rating *</Label>
                  <select id="r-rating" value={formRating} onChange={(e) => setFormRating(Number(e.target.value) as 1 | 3 | 5)} className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background">
                    <option value={1}>1 - Low</option>
                    <option value={3}>3 - Medium</option>
                    <option value={5}>5 - High</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-concern">Concern Description *</Label>
                <Input id="r-concern" value={formConcern} onChange={(e) => setFormConcern(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-action">MFG Action</Label>
                <Input id="r-action" value={formAction} onChange={(e) => setFormAction(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-resp">Responsible</Label>
                  <Input id="r-resp" value={formResp} onChange={(e) => setFormResp(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-target">Target</Label>
                  <Input id="r-target" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-1" /> Add Concern
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RepeatsTab;
