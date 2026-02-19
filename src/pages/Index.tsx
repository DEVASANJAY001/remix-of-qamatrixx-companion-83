import { useState, useMemo, useCallback } from "react";
import Dashboard from "@/components/Dashboard";
import QAMatrixTable from "@/components/QAMatrixTable";
import AddConcernDialog from "@/components/AddConcernDialog";
import FileUploadDialog from "@/components/FileUploadDialog";
import RepeatsTab from "@/components/RepeatsTab";
import UpdateDiffDialog, { DiffEntry } from "@/components/UpdateDiffDialog";
import { QAMatrixEntry } from "@/types/qaMatrix";
import { DVXEntry, MatchedRepeat, UnmatchedDefect } from "@/types/dvxReport";
import { recalculateStatuses } from "@/utils/qaCalculations";
import { exportToCSV } from "@/utils/csvExport";
import { exportToXLSX } from "@/utils/xlsxExport";
import { qaMatrixData } from "@/data/qaMatrixData";
import { findBestMatch } from "@/utils/stringMatch";
import { Shield, Search, Filter, X, Download, FileSpreadsheet, RotateCcw, Repeat, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [data, setData] = useState<QAMatrixEntry[]>(qaMatrixData);
  const [activeTab, setActiveTab] = useState<"matrix" | "repeats">("matrix");
  const [filter, setFilter] = useState<{ rating?: 1 | 3 | 5; level?: string; status?: "OK" | "NG" } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  // Lifted repeat state
  const [dvxEntries, setDvxEntries] = useState<DVXEntry[]>([]);
  const [repeatFileName, setRepeatFileName] = useState("");
  const [matched, setMatched] = useState<MatchedRepeat[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedDefect[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Feature 3: Apply to matrix state
  const [isRepeatApplied, setIsRepeatApplied] = useState(false);
  const [preApplySnapshot, setPreApplySnapshot] = useState<QAMatrixEntry[] | null>(null);
  const [diffEntries, setDiffEntries] = useState<DiffEntry[]>([]);
  const [showDiffDialog, setShowDiffDialog] = useState(false);

  const sources = useMemo(() => [...new Set(data.map(d => d.source))].sort(), [data]);
  const designations = useMemo(() => [...new Set(data.map(d => d.designation.toUpperCase()))].sort(), [data]);

  const updateData = (updater: (prev: QAMatrixEntry[]) => QAMatrixEntry[]) => {
    setData(prev => updater(prev));
  };

  const handleWeeklyUpdate = (sNo: number, weekIndex: number, value: number) => {
    updateData(prev => prev.map(entry => {
      if (entry.sNo !== sNo) return entry;
      const newWeekly = [...entry.weeklyRecurrence];
      newWeekly[weekIndex] = value;
      return recalculateStatuses({ ...entry, weeklyRecurrence: newWeekly });
    }));
  };

  const handleScoreUpdate = (sNo: number, section: "trim" | "chassis" | "final" | "qControl" | "qControlDetail", key: string, value: number | null) => {
    updateData(prev => prev.map(entry => {
      if (entry.sNo !== sNo) return entry;
      const updated = { ...entry, [section]: { ...entry[section], [key]: value } };
      return recalculateStatuses(updated);
    }));
  };

  const handleFieldUpdate = (sNo: number, field: string, value: string) => {
    updateData(prev => prev.map(entry => {
      if (entry.sNo !== sNo) return entry;
      if (field === "defectRating") {
        const newRating = Number(value) as 1 | 3 | 5;
        return recalculateStatuses({ ...entry, defectRating: newRating });
      }
      return { ...entry, [field]: value };
    }));
  };

  const handleDeleteEntry = (sNo: number) => {
    updateData(prev => prev.filter(entry => entry.sNo !== sNo));
  };

  const handleFileImport = (entries: QAMatrixEntry[]) => {
    updateData(prev => [...prev, ...entries]);
  };

  const handleAddConcern = (entry: QAMatrixEntry) => {
    updateData(prev => [...prev, entry]);
  };

  const handleDashboardFilter = (filterType: string, filterValue: string) => {
    if (filterType === "designation") setDesignationFilter(filterValue);
    else if (filterType === "source") setSourceFilter(filterValue);
  };

  // --- Repeat matching logic ---
  const runMatching = useCallback((entries: DVXEntry[], currentData: QAMatrixEntry[]) => {
    const qaConcerns = currentData.map(q => ({
      sNo: q.sNo,
      concern: q.concern,
      operationStation: q.operationStation,
      designation: q.designation,
    }));

    const matchMap = new Map<number, MatchedRepeat>();
    const unmatchedList: UnmatchedDefect[] = [];

    entries.forEach((dvx, idx) => {
      const searchText = `${dvx.locationDetails} ${dvx.defectDescription} ${dvx.defectDescriptionDetails}`;
      const match = findBestMatch(searchText, qaConcerns, 0.15, dvx.locationDetails);

      if (match) {
        const existing = matchMap.get(match.sNo);
        if (existing) {
          existing.dvxEntries.push(dvx);
          existing.repeatCount += dvx.quantity;
        } else {
          matchMap.set(match.sNo, {
            dvxEntries: [dvx],
            repeatCount: dvx.quantity,
            qaSNo: match.sNo,
            qaConcern: match.concern,
            matchScore: match.score,
          });
        }
      } else {
        unmatchedList.push({ dvxEntry: dvx, id: `unmatched-${idx}` });
      }
    });

    const matchedArr = Array.from(matchMap.values()).sort((a, b) => b.repeatCount - a.repeatCount);
    setMatched(matchedArr);
    setUnmatched(unmatchedList);
    setIsRepeatApplied(false);
    setPreApplySnapshot(null);
    setDiffEntries([]);
  }, []);

  const handleRepeatFileUpload = useCallback((entries: DVXEntry[], fileName: string) => {
    setDvxEntries(entries);
    setRepeatFileName(fileName);
    setAddedIds(new Set());
    setData(prev => {
      setTimeout(() => runMatching(entries, prev), 0);
      return prev;
    });
  }, [runMatching]);

  const handleRepeatAddConcern = useCallback((entry: QAMatrixEntry) => {
    setData(prev => {
      const newData = [...prev, entry];
      setTimeout(() => runMatching(dvxEntries, newData), 0);
      return newData;
    });
  }, [dvxEntries, runMatching]);

  const handleRepeatClear = useCallback(() => {
    setDvxEntries([]);
    setRepeatFileName("");
    setMatched([]);
    setUnmatched([]);
    setAddedIds(new Set());
    setIsRepeatApplied(false);
    setPreApplySnapshot(null);
    setDiffEntries([]);
  }, []);

  // Feature 2: Unpair a defect from a matched concern
  const handleUnpair = useCallback((qaSNo: number, dvxIdx: number) => {
    setMatched(prev => {
      const newMatched = prev.map(m => {
        if (m.qaSNo !== qaSNo) return m;
        const newEntries = [...m.dvxEntries];
        const removed = newEntries.splice(dvxIdx, 1)[0];
        if (newEntries.length === 0) return null;
        return { ...m, dvxEntries: newEntries, repeatCount: m.repeatCount - removed.quantity };
      }).filter(Boolean) as MatchedRepeat[];
      return newMatched;
    });
    // Move to unmatched
    setUnmatched(prev => {
      const m = matched.find(m => m.qaSNo === qaSNo);
      if (!m) return prev;
      const dvx = m.dvxEntries[dvxIdx];
      return [...prev, { dvxEntry: dvx, id: `unmatched-manual-${Date.now()}` }];
    });
  }, [matched]);

  // Feature 2: Reassign a defect to a different concern
  const handleReassign = useCallback((dvxEntry: DVXEntry, fromSNo: number, toSNo: number) => {
    setMatched(prev => {
      let newMatched = prev.map(m => {
        if (m.qaSNo === fromSNo) {
          const newEntries = m.dvxEntries.filter(d => d !== dvxEntry);
          if (newEntries.length === 0) return null;
          return { ...m, dvxEntries: newEntries, repeatCount: m.repeatCount - dvxEntry.quantity };
        }
        return m;
      }).filter(Boolean) as MatchedRepeat[];

      const existing = newMatched.find(m => m.qaSNo === toSNo);
      if (existing) {
        existing.dvxEntries.push(dvxEntry);
        existing.repeatCount += dvxEntry.quantity;
      } else {
        const qa = data.find(q => q.sNo === toSNo);
        newMatched.push({
          dvxEntries: [dvxEntry],
          repeatCount: dvxEntry.quantity,
          qaSNo: toSNo,
          qaConcern: qa?.concern || "",
          matchScore: 1,
        });
      }
      return newMatched;
    });
  }, [data]);

  // Feature 5: Manual pair from unmatched to existing concern
  const handleManualPair = useCallback((unmatchedId: string, qaSNo: number) => {
    const item = unmatched.find(u => u.id === unmatchedId);
    if (!item) return;

    setMatched(prev => {
      const existing = prev.find(m => m.qaSNo === qaSNo);
      if (existing) {
        return prev.map(m => {
          if (m.qaSNo !== qaSNo) return m;
          return { ...m, dvxEntries: [...m.dvxEntries, item.dvxEntry], repeatCount: m.repeatCount + item.dvxEntry.quantity };
        });
      } else {
        const qa = data.find(q => q.sNo === qaSNo);
        return [...prev, {
          dvxEntries: [item.dvxEntry],
          repeatCount: item.dvxEntry.quantity,
          qaSNo,
          qaConcern: qa?.concern || "",
          matchScore: 1,
        }];
      }
    });

    setUnmatched(prev => prev.filter(u => u.id !== unmatchedId));
    setAddedIds(prev => new Set(prev).add(unmatchedId));
  }, [unmatched, data]);

  // Feature 3: Apply repeat data to QA Matrix
  const handleApplyToMatrix = useCallback(() => {
    setPreApplySnapshot([...data.map(d => ({ ...d, weeklyRecurrence: [...d.weeklyRecurrence] }))]);

    const diffs: DiffEntry[] = [];
    setData(prev => {
      return prev.map(entry => {
        const m = matched.find(m => m.qaSNo === entry.sNo);
        if (!m) return entry;
        const oldW1 = entry.weeklyRecurrence[5];
        const newW1 = oldW1 + m.repeatCount;
        const newWeekly = [...entry.weeklyRecurrence];
        newWeekly[5] = newW1;
        diffs.push({
          sNo: entry.sNo,
          concern: entry.concern,
          field: "W-1 (Last Week)",
          before: oldW1,
          after: newW1,
        });
        const updated = recalculateStatuses({ ...entry, weeklyRecurrence: newWeekly });
        if (entry.workstationStatus !== updated.workstationStatus) {
          diffs.push({ sNo: entry.sNo, concern: entry.concern, field: "WS Status", before: entry.workstationStatus, after: updated.workstationStatus });
        }
        if (entry.mfgStatus !== updated.mfgStatus) {
          diffs.push({ sNo: entry.sNo, concern: entry.concern, field: "MFG Status", before: entry.mfgStatus, after: updated.mfgStatus });
        }
        if (entry.plantStatus !== updated.plantStatus) {
          diffs.push({ sNo: entry.sNo, concern: entry.concern, field: "Plant Status", before: entry.plantStatus, after: updated.plantStatus });
        }
        return updated;
      });
    });

    setDiffEntries(diffs);
    setIsRepeatApplied(true);
    setShowDiffDialog(true);
  }, [data, matched]);

  // Feature 3: Undo apply
  const handleUndoApply = useCallback(() => {
    if (preApplySnapshot) {
      setData(preApplySnapshot);
      setPreApplySnapshot(null);
      setIsRepeatApplied(false);
      setDiffEntries([]);
      setShowDiffDialog(false);
    }
  }, [preApplySnapshot]);

  const filteredData = useMemo(() => {
    let result = data;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d =>
        d.concern.toLowerCase().includes(term) ||
        d.operationStation.toLowerCase().includes(term) ||
        d.sNo.toString().includes(term)
      );
    }
    if (sourceFilter) result = result.filter(d => d.source.toUpperCase() === sourceFilter.toUpperCase());
    if (designationFilter) result = result.filter(d => d.designation.toUpperCase() === designationFilter.toUpperCase());
    if (ratingFilter) result = result.filter(d => d.defectRating === Number(ratingFilter));
    if (statusFilter === "NG") result = result.filter(d => d.workstationStatus === "NG" || d.mfgStatus === "NG" || d.plantStatus === "NG");
    if (statusFilter === "OK") result = result.filter(d => d.workstationStatus === "OK" && d.mfgStatus === "OK" && d.plantStatus === "OK");
    return result;
  }, [data, searchTerm, sourceFilter, designationFilter, ratingFilter, statusFilter]);

  const hasActiveFilters = sourceFilter || designationFilter || statusFilter || ratingFilter || searchTerm;

  const clearAllFilters = () => {
    setSearchTerm("");
    setSourceFilter("");
    setDesignationFilter("");
    setStatusFilter("");
    setRatingFilter("");
    setFilter(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">QA Matrix</h1>
            <p className="text-[11px] text-muted-foreground">Quality Assurance Control & Monitoring System</p>
          </div>
          <div className="ml-6 flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "matrix" ? "bg-card shadow text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              QA Matrix
            </button>
            <button
              onClick={() => setActiveTab("repeats")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "repeats" ? "bg-card shadow text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              Repeats
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {activeTab === "matrix" && (
              <>
                <AddConcernDialog nextSNo={data.length + 1} onAdd={handleAddConcern} />
                <FileUploadDialog nextSNo={data.length + 1} onImport={handleFileImport} />
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportToXLSX(filteredData)}>
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Excel
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportToCSV(filteredData)}>
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
                {isRepeatApplied && preApplySnapshot && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1.5 text-primary" onClick={() => setShowDiffDialog(true)}>
                      View Changes
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={handleUndoApply}>
                      <Undo2 className="w-4 h-4" />
                      Undo Repeat Update
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => { setData(qaMatrixData); setIsRepeatApplied(false); setPreApplySnapshot(null); setDiffEntries([]); }} title="Reset to original data">
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
              <span className="font-mono">{data.length} concerns</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span className="font-mono text-destructive font-semibold">
                {data.filter(d => d.plantStatus === "NG").length} Plant NG
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6 space-y-6">
        {activeTab === "matrix" ? (
          <>
            <Dashboard data={data} onFilterByCategory={handleDashboardFilter} />

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
                <p className="text-xs text-muted-foreground">Showing {filteredData.length} of {data.length} concerns</p>
              )}
            </div>

            <div>
              <h2 className="section-header mb-3">QA Matrix Details</h2>
              <QAMatrixTable
                data={filteredData}
                filter={filter}
                onClearFilter={() => setFilter(null)}
                onWeeklyUpdate={handleWeeklyUpdate}
                onScoreUpdate={handleScoreUpdate}
                onFieldUpdate={handleFieldUpdate}
                onDeleteEntry={handleDeleteEntry}
              />
            </div>
          </>
        ) : (
          <RepeatsTab
            qaData={data}
            dvxEntries={dvxEntries}
            fileName={repeatFileName}
            matched={matched}
            unmatched={unmatched}
            addedIds={addedIds}
            onFileUpload={handleRepeatFileUpload}
            onAddToQAMatrix={handleRepeatAddConcern}
            onClear={handleRepeatClear}
            onSetAddedIds={setAddedIds}
            onWeeklyUpdate={handleWeeklyUpdate}
            onScoreUpdate={handleScoreUpdate}
            onFieldUpdate={handleFieldUpdate}
            onDeleteEntry={handleDeleteEntry}
            onDashboardFilter={handleDashboardFilter}
            onApplyToMatrix={handleApplyToMatrix}
            onUnpair={handleUnpair}
            onReassign={handleReassign}
            onManualPair={handleManualPair}
            isApplied={isRepeatApplied}
          />
        )}
      </main>

      {/* Feature 3: Diff dialog */}
      <UpdateDiffDialog
        open={showDiffDialog}
        onClose={() => setShowDiffDialog(false)}
        diffs={diffEntries}
        onUndo={handleUndoApply}
        isApplied={isRepeatApplied}
      />
    </div>
  );
};

export default Index;
