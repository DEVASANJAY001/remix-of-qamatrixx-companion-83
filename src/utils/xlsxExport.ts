import * as XLSX from "xlsx";
import { QAMatrixEntry } from "@/types/qaMatrix";

const headers = [
  "S.No", "Source", "Operation Station", "Designation of the operation",
  "Concern Discerption [Mode of failure]", "Defect Rating (1/3/5)",
  "Reccurence", "Last 6 Weeks", "Last 5 Weeks", "Last 4 Weeks",
  "Last 3 Weeks", "Last 2 Weeks", "Last Week", "Reccurence Count+Defect Rating",
  "T10", "T20", "T30", "T40", "T50", "T60", "T70", "T80", "T90", "T100", "TPQG",
  "C10", "C20", "C30", "C40", "C45", "P10", "P20", "P30", "C50", "C60", "C70",
  "R/Sub", "T/S", "C80", "C PQG",
  "F10", "F20", "F30", "F40", "F50", "F60", "F70", "F80", "F90", "F100", "FPQG",
  "Residual Torque",
  "1.1: Frequency Control", "1.2:Visual Control", "1.3:Periodic audit Process monitoring",
  "1.4:100% Human Control without tracking", "3.1:SAE(Error Proofing) alert",
  "3.2:Frequency control (Measurements)", "3.3:100% Manual control in the line with tool",
  "3.4:100% human control with tracking", "5.1:100% automatic control",
  "5.2:Impossibility of assembly or subsequent machining", "5.3:SAE(Error proofing) Prohibition",
  "CVT", "SHOWER", "Dynamic/ UB", "CC4",
  "MFG", "Quality", "Plant",
  "Wokstation", "MFG", "Plant",
  "MFG Action", "Resp", "Target",
];

export function exportToXLSX(data: QAMatrixEntry[], filename = "qa-matrix-export.xlsx") {
  const rows = data.map(d => [
    d.sNo, d.source, d.operationStation, d.designation, d.concern, d.defectRating,
    d.recurrence,
    ...d.weeklyRecurrence,
    d.recurrenceCountPlusDefect,
    d.trim.T10, d.trim.T20, d.trim.T30, d.trim.T40, d.trim.T50,
    d.trim.T60, d.trim.T70, d.trim.T80, d.trim.T90, d.trim.T100, d.trim.TPQG,
    d.chassis.C10, d.chassis.C20, d.chassis.C30, d.chassis.C40, d.chassis.C45,
    d.chassis.P10, d.chassis.P20, d.chassis.P30, d.chassis.C50, d.chassis.C60,
    d.chassis.C70, d.chassis.RSub, d.chassis.TS, d.chassis.C80, d.chassis.CPQG,
    d.final.F10, d.final.F20, d.final.F30, d.final.F40, d.final.F50,
    d.final.F60, d.final.F70, d.final.F80, d.final.F90, d.final.F100,
    d.final.FPQG, d.final.ResidualTorque,
    d.qControl.freqControl_1_1, d.qControl.visualControl_1_2,
    d.qControl.periodicAudit_1_3, d.qControl.humanControl_1_4,
    d.qControl.saeAlert_3_1, d.qControl.freqMeasure_3_2,
    d.qControl.manualTool_3_3, d.qControl.humanTracking_3_4,
    d.qControl.autoControl_5_1, d.qControl.impossibility_5_2,
    d.qControl.saeProhibition_5_3,
    d.qControlDetail.CVT, d.qControlDetail.SHOWER,
    d.qControlDetail.DynamicUB, d.qControlDetail.CC4,
    d.controlRating.MFG, d.controlRating.Quality, d.controlRating.Plant,
    d.workstationStatus, d.mfgStatus, d.plantStatus,
    d.mfgAction, d.resp, d.target,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "QA Matrix");
  XLSX.writeFile(wb, filename);
}
