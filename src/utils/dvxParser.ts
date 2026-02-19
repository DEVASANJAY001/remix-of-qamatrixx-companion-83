import * as XLSX from "xlsx";
import { DVXEntry } from "@/types/dvxReport";

function normalizeHeader(h: string): string {
  return String(h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, " ");
}

function findCol(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const nm = normalizeHeader(name);
    // Exact match first
    const exact = headers.indexOf(nm);
    if (exact !== -1) return exact;
    // Starts with
    const starts = headers.findIndex(h => h.startsWith(nm));
    if (starts !== -1) return starts;
    // Contains
    const contains = headers.findIndex(h => h.includes(nm));
    if (contains !== -1) return contains;
  }
  return -1;
}

/** Find the header row by looking for known column names */
function findHeaderRow(rows: any[][]): number {
  const knownHeaders = ["defect description", "defect code", "gravity", "location details", "quantity"];
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row) continue;
    const normalized = row.map((c: any) => normalizeHeader(String(c || "")));
    const matchCount = knownHeaders.filter(kh => normalized.some(h => h.includes(kh))).length;
    if (matchCount >= 3) return i;
  }
  return 0; // fallback to first row
}

export function parseDVXSheet(sheet: XLSX.WorkSheet): DVXEntry[] {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rows.length < 2) return [];

  const headerRowIdx = findHeaderRow(rows);
  const rawHeaders = (rows[headerRowIdx] || []).map((h: any) => String(h || "").trim());
  const headers = rawHeaders.map(normalizeHeader);

  // Find columns - use exact name first for "Defect Description" vs "Defect Description Details"
  const dateCol = findCol(headers, "Date");
  const locationCol = findCol(headers, "Location Details", "Location");
  const codeCol = findCol(headers, "Defect Code");
  // For description vs details: match exact first to avoid collision
  const descCol = headers.indexOf("defect description") !== -1 
    ? headers.indexOf("defect description") 
    : findCol(headers, "Defect Description");
  const detailsCol = findCol(headers, "Defect Description Details");
  const gravityCol = findCol(headers, "Gravity");
  const qtyCol = findCol(headers, "Quantity");
  const sourceCol = findCol(headers, "Source");
  const respCol = findCol(headers, "Responsible");
  const pofFamilyCol = findCol(headers, "POF Family");
  const pofCodeCol = findCol(headers, "POF CODE", "POF Code");

  console.log("Header row:", headerRowIdx, "Columns found:", {
    date: dateCol, location: locationCol, code: codeCol, 
    desc: descCol, details: detailsCol, gravity: gravityCol,
    qty: qtyCol, source: sourceCol
  });

  const getVal = (row: any[], col: number): string => {
    if (col < 0 || col >= row.length) return "";
    return String(row[col] ?? "").trim();
  };

  const entries: DVXEntry[] = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const desc = getVal(row, descCol);
    const details = getVal(row, detailsCol);
    const location = getVal(row, locationCol);
    // Skip rows with no meaningful data
    if (!desc && !details && !location) continue;

    const qtyRaw = qtyCol >= 0 ? row[qtyCol] : 0;
    const qty = typeof qtyRaw === "number" ? qtyRaw : parseInt(String(qtyRaw)) || 1;

    entries.push({
      date: getVal(row, dateCol),
      locationDetails: location,
      defectCode: getVal(row, codeCol),
      defectDescription: desc,
      defectDescriptionDetails: details,
      gravity: getVal(row, gravityCol),
      quantity: qty,
      source: getVal(row, sourceCol),
      responsible: getVal(row, respCol),
      pofFamily: getVal(row, pofFamilyCol),
      pofCode: getVal(row, pofCodeCol),
    });
  }

  return entries;
}
