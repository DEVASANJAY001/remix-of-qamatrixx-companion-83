import { useState, useRef } from "react";
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
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";

interface FileUploadDialogProps {
  nextSNo: number;
  onImport: (entries: QAMatrixEntry[]) => void;
}

const n = null;

function normalizeHeader(h: string): string {
  return String(h || "").trim().toLowerCase().replace(/[\s_]+/g, " ");
}

function parseSheet(sheet: XLSX.WorkSheet, startSNo: number): QAMatrixEntry[] {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rows.length < 2) return [];

  const rawHeaders = (rows[0] || []).map((h: any) => String(h || "").trim());
  const headers = rawHeaders.map(normalizeHeader);

  // Build a map of header -> column index
  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => { colMap[h] = i; });

  const find = (...names: string[]): number => {
    for (const name of names) {
      const nm = normalizeHeader(name);
      if (colMap[nm] !== undefined) return colMap[nm];
      // Try exact original header match
      const idx = rawHeaders.findIndex(r => r === name);
      if (idx !== -1) return idx;
      // Partial match
      const idx2 = headers.findIndex(h => h.includes(nm));
      if (idx2 !== -1) return idx2;
    }
    return -1;
  };

  const getVal = (row: any[], col: number): string => {
    if (col < 0 || col >= row.length) return "";
    return String(row[col] ?? "").trim();
  };

  const getNum = (row: any[], col: number): number | null => {
    if (col < 0 || col >= row.length) return null;
    const v = row[col];
    if (v === null || v === undefined || v === "") return null;
    const num = Number(v);
    return isNaN(num) ? null : num;
  };

  // Basic columns
  const sNoCol = find("S.No", "sno", "s.no");
  const sourceCol = find("Source", "src");
  const stationCol = find("Station", "stn", "operation station");
  const areaCol = find("Area", "designation");
  const concernCol = find("Concern", "description");
  const drCol = find("Defect Rating", "dr", "rating");
  const respCol = find("Resp", "responsible");
  const actionCol = find("MFG Action", "action");
  const targetCol = find("Target");

  // Weekly recurrence columns
  const w6Col = find("W-6");
  const w5Col = find("W-5");
  const w4Col = find("W-4");
  const w3Col = find("W-3");
  const w2Col = find("W-2");
  const w1Col = find("W-1");
  const rcdrCol = find("RC+DR");

  // Trim columns
  const tCols = {
    T10: find("T10"), T20: find("T20"), T30: find("T30"), T40: find("T40"),
    T50: find("T50"), T60: find("T60"), T70: find("T70"), T80: find("T80"),
    T90: find("T90"), T100: find("T100"), TPQG: find("TPQG"),
  };

  // Chassis columns
  const cCols = {
    C10: find("C10"), C20: find("C20"), C30: find("C30"), C40: find("C40"),
    C45: find("C45"), P10: find("P10"), P20: find("P20"), P30: find("P30"),
    C50: find("C50"), C60: find("C60"), C70: find("C70"), RSub: find("RSub"),
    TS: find("TS"), C80: find("C80"), CPQG: find("CPQG"),
  };

  // Final columns
  const fCols = {
    F10: find("F10"), F20: find("F20"), F30: find("F30"), F40: find("F40"),
    F50: find("F50"), F60: find("F60"), F70: find("F70"), F80: find("F80"),
    F90: find("F90"), F100: find("F100"), FPQG: find("FPQG"),
  };
  const residualTorqueCol = find("Residual Torque");

  // QControl columns (1.1, 1.2, etc.)
  const qcCols = {
    freqControl_1_1: find("1.1"),
    visualControl_1_2: find("1.2"),
    periodicAudit_1_3: find("1.3"),
    humanControl_1_4: find("1.4"),
    saeAlert_3_1: find("3.1"),
    freqMeasure_3_2: find("3.2"),
    manualTool_3_3: find("3.3"),
    humanTracking_3_4: find("3.4"),
    autoControl_5_1: find("5.1"),
    impossibility_5_2: find("5.2"),
    saeProhibition_5_3: find("5.3"),
  };

  // QControl Detail
  const cvtCol = find("CVT");
  const showerCol = find("SHOWER");
  const dynamicUBCol = find("Dynamic/UB", "Dynamic/ UB", "DynamicUB");
  const cc4Col = find("CC4");

  // Control Rating
  const ctrlMfgCol = find("CTRL MFG");
  const ctrlQtyCol = find("CTRL Qty");
  const ctrlPlantCol = find("CTRL Plant");

  // Status columns
  const wsStatusCol = find("WS Status");
  const mfgStatusCol = find("MFG Status");
  const plantStatusCol = find("Plant Status");

  const entries: QAMatrixEntry[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const concern = getVal(row, concernCol);
    if (!concern) continue;

    const drRaw = getNum(row, drCol);
    const defectRating = (drRaw === 1 || drRaw === 3 || drRaw === 5) ? drRaw : 1;

    const weeklyRecurrence = [
      getNum(row, w6Col) ?? 0, getNum(row, w5Col) ?? 0, getNum(row, w4Col) ?? 0,
      getNum(row, w3Col) ?? 0, getNum(row, w2Col) ?? 0, getNum(row, w1Col) ?? 0,
    ];
    const recurrence = weeklyRecurrence.reduce((a, b) => a + b, 0);

    const trim = {
      T10: getNum(row, tCols.T10), T20: getNum(row, tCols.T20), T30: getNum(row, tCols.T30),
      T40: getNum(row, tCols.T40), T50: getNum(row, tCols.T50), T60: getNum(row, tCols.T60),
      T70: getNum(row, tCols.T70), T80: getNum(row, tCols.T80), T90: getNum(row, tCols.T90),
      T100: getNum(row, tCols.T100), TPQG: getNum(row, tCols.TPQG),
    };

    const chassis = {
      C10: getNum(row, cCols.C10), C20: getNum(row, cCols.C20), C30: getNum(row, cCols.C30),
      C40: getNum(row, cCols.C40), C45: getNum(row, cCols.C45), P10: getNum(row, cCols.P10),
      P20: getNum(row, cCols.P20), P30: getNum(row, cCols.P30), C50: getNum(row, cCols.C50),
      C60: getNum(row, cCols.C60), C70: getNum(row, cCols.C70), RSub: getNum(row, cCols.RSub),
      TS: getNum(row, cCols.TS), C80: getNum(row, cCols.C80), CPQG: getNum(row, cCols.CPQG),
    };

    const final = {
      F10: getNum(row, fCols.F10), F20: getNum(row, fCols.F20), F30: getNum(row, fCols.F30),
      F40: getNum(row, fCols.F40), F50: getNum(row, fCols.F50), F60: getNum(row, fCols.F60),
      F70: getNum(row, fCols.F70), F80: getNum(row, fCols.F80), F90: getNum(row, fCols.F90),
      F100: getNum(row, fCols.F100), FPQG: getNum(row, fCols.FPQG),
      ResidualTorque: getNum(row, residualTorqueCol),
    };

    const qControl = {
      freqControl_1_1: getNum(row, qcCols.freqControl_1_1),
      visualControl_1_2: getNum(row, qcCols.visualControl_1_2),
      periodicAudit_1_3: getNum(row, qcCols.periodicAudit_1_3),
      humanControl_1_4: getNum(row, qcCols.humanControl_1_4),
      saeAlert_3_1: getNum(row, qcCols.saeAlert_3_1),
      freqMeasure_3_2: getNum(row, qcCols.freqMeasure_3_2),
      manualTool_3_3: getNum(row, qcCols.manualTool_3_3),
      humanTracking_3_4: getNum(row, qcCols.humanTracking_3_4),
      autoControl_5_1: getNum(row, qcCols.autoControl_5_1),
      impossibility_5_2: getNum(row, qcCols.impossibility_5_2),
      saeProhibition_5_3: getNum(row, qcCols.saeProhibition_5_3),
    };

    const qControlDetail = {
      CVT: getNum(row, cvtCol),
      SHOWER: getNum(row, showerCol),
      DynamicUB: getNum(row, dynamicUBCol),
      CC4: getNum(row, cc4Col),
    };

    const wsRaw = getVal(row, wsStatusCol).toUpperCase();
    const mfgRaw = getVal(row, mfgStatusCol).toUpperCase();
    const plantRaw = getVal(row, plantStatusCol).toUpperCase();

    const entry: QAMatrixEntry = {
      sNo: getNum(row, sNoCol) ?? (startSNo + entries.length),
      source: getVal(row, sourceCol) || "Import",
      operationStation: getVal(row, stationCol) || "",
      designation: getVal(row, areaCol) || "",
      concern,
      defectRating,
      recurrence,
      weeklyRecurrence,
      recurrenceCountPlusDefect: getNum(row, rcdrCol) ?? (defectRating + recurrence),
      trim, chassis, final, qControl, qControlDetail,
      controlRating: {
        MFG: getNum(row, ctrlMfgCol) ?? 0,
        Quality: getNum(row, ctrlQtyCol) ?? 0,
        Plant: getNum(row, ctrlPlantCol) ?? 0,
      },
      guaranteedQuality: { Workstation: n, MFG: n, Plant: n },
      workstationStatus: wsRaw === "OK" ? "OK" : "NG",
      mfgStatus: mfgRaw === "OK" ? "OK" : "NG",
      plantStatus: plantRaw === "OK" ? "OK" : "NG",
      mfgAction: getVal(row, actionCol),
      resp: getVal(row, respCol),
      target: getVal(row, targetCol),
    };

    entries.push(recalculateStatuses(entry));
  }

  return entries;
}

const FileUploadDialog = ({ nextSNo, onImport }: FileUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<QAMatrixEntry[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const entries = parseSheet(sheet, nextSNo);
      setPreview(entries);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    if (preview.length > 0) {
      onImport(preview);
      setOpen(false);
      setPreview([]);
      setFileName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPreview([]); setFileName(""); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Upload className="w-4 h-4" />
          Upload File
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Import QA Matrix Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Upload a CSV or Excel file (.xlsx, .xls) with QA Matrix data.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
          />
          {fileName && (
            <p className="text-sm">
              File: <span className="font-semibold">{fileName}</span> — {preview.length} rows detected
            </p>
          )}
          {preview.length > 0 && (
            <div className="max-h-[200px] overflow-auto border border-border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">Source</th>
                    <th className="px-2 py-1 text-left">Station</th>
                    <th className="px-2 py-1 text-left">Concern</th>
                    <th className="px-2 py-1 text-center">DR</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((entry) => (
                    <tr key={entry.sNo} className="border-t border-border/30">
                      <td className="px-2 py-1">{entry.sNo}</td>
                      <td className="px-2 py-1">{entry.source}</td>
                      <td className="px-2 py-1">{entry.operationStation}</td>
                      <td className="px-2 py-1 max-w-[200px] truncate">{entry.concern}</td>
                      <td className="px-2 py-1 text-center">{entry.defectRating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 20 && (
                <p className="text-xs text-muted-foreground p-2">...and {preview.length - 20} more rows</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={preview.length === 0}>
              Import {preview.length} Rows
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadDialog;
