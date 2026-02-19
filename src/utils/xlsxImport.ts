import * as XLSX from "xlsx";
import { QAMatrixEntry } from "@/types/qaMatrix";
import { recalculateStatuses } from "@/utils/qaCalculations";

const trimKeys = ["T10","T20","T30","T40","T50","T60","T70","T80","T90","T100","TPQG"] as const;
const chassisKeys = ["C10","C20","C30","C40","C45","P10","P20","P30","C50","C60","C70","RSub","TS","C80","CPQG"] as const;
const finalKeys = ["F10","F20","F30","F40","F50","F60","F70","F80","F90","F100","FPQG"] as const;
const qControlKeys = ["freqControl_1_1","visualControl_1_2","periodicAudit_1_3","humanControl_1_4","saeAlert_3_1","freqMeasure_3_2","manualTool_3_3","humanTracking_3_4","autoControl_5_1","impossibility_5_2","saeProhibition_5_3"] as const;

function numOrNull(val: unknown): number | null {
  if (val === undefined || val === null || val === "" || val === " ") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function str(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

export async function loadFromExcel(url: string): Promise<QAMatrixEntry[]> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let startIdx = 0;
  for (let i = 0; i < rows.length; i++) {
    const firstCell = rows[i]?.[0];
    if (typeof firstCell === "number" || (typeof firstCell === "string" && /^\d+$/.test(firstCell.trim()))) {
      startIdx = i;
      break;
    }
  }

  const entries: QAMatrixEntry[] = [];

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 10) continue;
    const sNo = Number(r[0]);
    if (isNaN(sNo) || sNo === 0) continue;

    const defectRating = Number(r[5]) as 1 | 3 | 5;
    const weeklyRecurrence = [
      Number(r[7]) || 0, Number(r[8]) || 0, Number(r[9]) || 0,
      Number(r[10]) || 0, Number(r[11]) || 0, Number(r[12]) || 0,
    ];

    const trim = {
      T10: numOrNull(r[14]), T20: numOrNull(r[15]), T30: numOrNull(r[16]),
      T40: numOrNull(r[17]), T50: numOrNull(r[18]), T60: numOrNull(r[19]),
      T70: numOrNull(r[20]), T80: numOrNull(r[21]), T90: numOrNull(r[22]),
      T100: numOrNull(r[23]), TPQG: numOrNull(r[24]),
    };

    const chassis = {
      C10: numOrNull(r[25]), C20: numOrNull(r[26]), C30: numOrNull(r[27]),
      C40: numOrNull(r[28]), C45: numOrNull(r[29]), P10: numOrNull(r[30]),
      P20: numOrNull(r[31]), P30: numOrNull(r[32]), C50: numOrNull(r[33]),
      C60: numOrNull(r[34]), C70: numOrNull(r[35]), RSub: numOrNull(r[36]),
      TS: numOrNull(r[37]), C80: numOrNull(r[38]), CPQG: numOrNull(r[39]),
    };

    const final = {
      F10: numOrNull(r[40]), F20: numOrNull(r[41]), F30: numOrNull(r[42]),
      F40: numOrNull(r[43]), F50: numOrNull(r[44]), F60: numOrNull(r[45]),
      F70: numOrNull(r[46]), F80: numOrNull(r[47]), F90: numOrNull(r[48]),
      F100: numOrNull(r[49]), FPQG: numOrNull(r[50]), ResidualTorque: numOrNull(r[51]),
    };

    const qControl = {
      freqControl_1_1: numOrNull(r[52]), visualControl_1_2: numOrNull(r[53]),
      periodicAudit_1_3: numOrNull(r[54]), humanControl_1_4: numOrNull(r[55]),
      saeAlert_3_1: numOrNull(r[56]), freqMeasure_3_2: numOrNull(r[57]),
      manualTool_3_3: numOrNull(r[58]), humanTracking_3_4: numOrNull(r[59]),
      autoControl_5_1: numOrNull(r[60]), impossibility_5_2: numOrNull(r[61]),
      saeProhibition_5_3: numOrNull(r[62]),
    };

    const qControlDetail = {
      CVT: numOrNull(r[63]), SHOWER: numOrNull(r[64]),
      DynamicUB: numOrNull(r[65]), CC4: numOrNull(r[66]),
    };

    const wsStatusRaw = str(r[70]).toUpperCase();
    const mfgStatusRaw = str(r[71]).toUpperCase();
    const plantStatusRaw = str(r[72]).toUpperCase();

    const entry: QAMatrixEntry = {
      sNo,
      source: str(r[1]),
      operationStation: str(r[2]),
      designation: str(r[3]),
      concern: str(r[4]),
      defectRating,
      recurrence: weeklyRecurrence.reduce((a, b) => a + b, 0),
      weeklyRecurrence,
      recurrenceCountPlusDefect: defectRating + weeklyRecurrence.reduce((a, b) => a + b, 0),
      trim, chassis, final, qControl, qControlDetail,
      controlRating: {
        MFG: numOrNull(r[67]),
        Quality: numOrNull(r[68]),
        Plant: numOrNull(r[69]),
      },
      guaranteedQuality: { Workstation: null, MFG: null, Plant: null },
      workstationStatus: (wsStatusRaw === "OK" ? "OK" : "NG"),
      mfgStatus: (mfgStatusRaw === "OK" ? "OK" : "NG"),
      plantStatus: (plantStatusRaw === "OK" ? "OK" : "NG"),
      mfgAction: str(r[73]),
      resp: str(r[74]),
      target: str(r[75]),
    };

    entries.push(recalculateStatuses(entry));
  }

  return entries;
}
