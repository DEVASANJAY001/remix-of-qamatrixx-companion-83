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
import { Upload, ExternalLink } from "lucide-react";
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

  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => { colMap[h] = i; });

  const find = (...names: string[]): number => {
    for (const name of names) {
      const nm = normalizeHeader(name);
      if (colMap[nm] !== undefined) return colMap[nm];
      const idx = rawHeaders.findIndex(r => r === name);
      if (idx !== -1) return idx;
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

  const sNoCol = find("S.No", "sno", "s.no");
  const sourceCol = find("Source", "src");
  const stationCol = find("Station", "stn", "operation station");
  const areaCol = find("Area", "designation");
  const concernCol = find("Concern", "description");
  const drCol = find("Defect Rating", "dr", "rating");
  const respCol = find("Resp", "responsible");
  const actionCol = find("MFG Action", "action");
  const targetCol = find("Target");

  const w6Col = find("W-6");
  const w5Col = find("W-5");
  const w4Col = find("W-4");
  const w3Col = find("W-3");
  const w2Col = find("W-2");
  const w1Col = find("W-1");
  const rcdrCol = find("RC+DR");

  const tCols = {
    T10: find("T10"), T20: find("T20"), T30: find("T30"), T40: find("T40"),
    T50: find("T50"), T60: find("T60"), T70: find("T70"), T80: find("T80"),
    T90: find("T90"), T100: find("T100"), TPQG: find("TPQG"),
  };

  const cCols = {
    C10: find("C10"), C20: find("C20"), C30: find("C30"), C40: find("C40"),
    C45: find("C45"), P10: find("P10"), P20: find("P20"), P30: find("P30"),
    C50: find("C50"), C60: find("C60"), C70: find("C70"), RSub: find("RSub"),
    TS: find("TS"), C80: find("C80"), CPQG: find("CPQG"),
  };

  const fCols = {
    F10: find("F10"), F20: find("F20"), F30: find("F30"), F40: find("F40"),
    F50: find("F50"), F60: find("F60"), F70: find("F70"), F80: find("F80"),
    F90: find("F90"), F100: find("F100"), FPQG: find("FPQG"),
  };
  const residualTorqueCol = find("Residual Torque");

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

  const cvtCol = find("CVT");
  const showerCol = find("SHOWER");
  const dynamicUBCol = find("Dynamic/UB", "Dynamic/ UB", "DynamicUB");
  const cc4Col = find("CC4");

  const ctrlMfgCol = find("CTRL MFG");
  const ctrlQtyCol = find("CTRL Qty");
  const ctrlPlantCol = find("CTRL Plant");

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
      trim: {},
      chassis: {},
      final: {},
      qControl: {},
      qControlDetail: {},
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

          {/* BUTTON ROW */}
          <div className="flex justify-between pt-2">

            {/* LEFT → FILE CONVERTER */}
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => window.open("https://matrixconverter.streamlit.app/", "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
              File Converter
            </Button>

            {/* RIGHT BUTTONS */}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>

              <Button onClick={handleImport} disabled={preview.length === 0}>
                Import {preview.length} Rows
              </Button>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadDialog;
