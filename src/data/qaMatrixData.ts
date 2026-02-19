import { QAMatrixEntry } from "@/types/qaMatrix";

const n = null;

function e(
  sNo: number, source: string, station: string, designation: string, concern: string,
  defectRating: 1|3|5, weeklyRecurrence: number[],
  trim: (number|null)[], chassis: (number|null)[], final: (number|null)[],
  qc: (number|null)[], qcd: (number|null)[],
  cr: [number,number,number], ws: "OK"|"NG", mfg: string, plant: "OK"|"NG",
  action: string, resp: string, target: string
): QAMatrixEntry {
  const recurrence = weeklyRecurrence.reduce((a,b)=>a+b,0);
  const mfgStatus: "OK" | "NG" = (mfg === "Ok" || mfg === "OK") ? "OK" : "NG";
  return {
    sNo, source, operationStation: station, designation, concern,
    defectRating, recurrence, weeklyRecurrence,
    recurrenceCountPlusDefect: defectRating + recurrence,
    trim: {T10:trim[0],T20:trim[1],T30:trim[2],T40:trim[3],T50:trim[4],T60:trim[5],T70:trim[6],T80:trim[7],T90:trim[8],T100:trim[9],TPQG:trim[10]},
    chassis: {C10:chassis[0],C20:chassis[1],C30:chassis[2],C40:chassis[3],C45:chassis[4],P10:chassis[5],P20:chassis[6],P30:chassis[7],C50:chassis[8],C60:chassis[9],C70:chassis[10],RSub:chassis[11],TS:chassis[12],C80:chassis[13],CPQG:chassis[14]},
    final: {F10:final[0],F20:final[1],F30:final[2],F40:final[3],F50:final[4],F60:final[5],F70:final[6],F80:final[7],F90:final[8],F100:final[9],FPQG:final[10],ResidualTorque:final[11]},
    qControl: {freqControl_1_1:qc[0],visualControl_1_2:qc[1],periodicAudit_1_3:qc[2],humanControl_1_4:qc[3],saeAlert_3_1:qc[4],freqMeasure_3_2:qc[5],manualTool_3_3:qc[6],humanTracking_3_4:qc[7],autoControl_5_1:qc[8],impossibility_5_2:qc[9],saeProhibition_5_3:qc[10]},
    qControlDetail: {CVT:qcd[0],SHOWER:qcd[1],DynamicUB:qcd[2],CC4:qcd[3]},
    controlRating: {MFG:cr[0],Quality:cr[1],Plant:cr[2]},
    guaranteedQuality: {Workstation:n,MFG:n,Plant:n},
    workstationStatus: ws, mfgStatus, plantStatus: plant,
    mfgAction: action, resp, target
  };
}

export const qaMatrixData: QAMatrixEntry[] = [];

export function getDashboardSummary(data: QAMatrixEntry[]) {
  const total = data.length;
  const okWorkstation = data.filter(d => d.workstationStatus === 'OK').length;
  const okMfg = data.filter(d => d.mfgStatus === 'OK').length;
  const okPlant = data.filter(d => d.plantStatus === 'OK').length;

  const byDesignation = (designation: string) => {
    const items = data.filter(d => d.designation.toUpperCase() === designation.toUpperCase());
    return {
      total: items.length,
      okWorkstation: items.filter(d => d.workstationStatus === 'OK').length,
      okMfg: items.filter(d => d.mfgStatus === 'OK').length,
      okPlant: items.filter(d => d.plantStatus === 'OK').length,
    };
  };

  const bySource = (source: string) => {
    const items = data.filter(d => d.source.toUpperCase() === source.toUpperCase());
    return {
      total: items.length,
      okWorkstation: items.filter(d => d.workstationStatus === 'OK').length,
      okMfg: items.filter(d => d.mfgStatus === 'OK').length,
      okPlant: items.filter(d => d.plantStatus === 'OK').length,
    };
  };

  return {
    total,
    okWorkstation,
    okMfg,
    okPlant,
    trim: byDesignation('TRIM'),
    chassis: byDesignation('CHASSIS'),
    final: byDesignation('FINAL'),
    dvx: bySource('DVX'),
    er3: bySource('ER3'),
    er4: bySource('ER4'),
    field: bySource('FIELD'),
    sca: bySource('SCA'),
  };
}
