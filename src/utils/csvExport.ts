import { QAMatrixEntry } from "@/types/qaMatrix";

const trimKeys = ["T10","T20","T30","T40","T50","T60","T70","T80","T90","T100","TPQG"] as const;
const chassisKeys = ["C10","C20","C30","C40","C45","P10","P20","P30","C50","C60","C70","RSub","TS","C80","CPQG"] as const;
const finalKeys = ["F10","F20","F30","F40","F50","F60","F70","F80","F90","F100","FPQG"] as const;
const qControlKeys = ["freqControl_1_1","visualControl_1_2","periodicAudit_1_3","humanControl_1_4","saeAlert_3_1","freqMeasure_3_2","manualTool_3_3","humanTracking_3_4","autoControl_5_1","impossibility_5_2","saeProhibition_5_3"] as const;

export function exportToCSV(data: QAMatrixEntry[], filename = "qa-matrix-export.csv") {
  const headers = [
    "S.No", "Source", "Station", "Area", "Concern", "Defect Rating",
    "W-6", "W-5", "W-4", "W-3", "W-2", "W-1", "RC+DR",
    ...trimKeys, ...chassisKeys, ...finalKeys,
    "Residual Torque",
    "1.1", "1.2", "1.3", "1.4", "3.1", "3.2", "3.3", "3.4", "5.1", "5.2", "5.3",
    "CVT", "SHOWER", "Dynamic/UB", "CC4",
    "CTRL MFG", "CTRL Qty", "CTRL Plant",
    "WS Status", "MFG Status", "Plant Status",
    "MFG Action", "Resp", "Target"
  ];

  const rows = data.map(d => [
    d.sNo, d.source, d.operationStation, d.designation,
    `"${d.concern.replace(/"/g, '""')}"`,
    d.defectRating,
    ...d.weeklyRecurrence,
    d.recurrenceCountPlusDefect,
    ...trimKeys.map(k => d.trim[k] ?? ""),
    ...chassisKeys.map(k => d.chassis[k] ?? ""),
    ...finalKeys.map(k => d.final[k] ?? ""),
    d.final.ResidualTorque ?? "",
    ...qControlKeys.map(k => d.qControl[k] ?? ""),
    d.qControlDetail.CVT ?? "", d.qControlDetail.SHOWER ?? "", d.qControlDetail.DynamicUB ?? "", d.qControlDetail.CC4 ?? "",
    d.controlRating.MFG, d.controlRating.Quality, d.controlRating.Plant,
    d.workstationStatus, d.mfgStatus, d.plantStatus,
    `"${(d.mfgAction || "").replace(/"/g, '""')}"`,
    d.resp, d.target
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
