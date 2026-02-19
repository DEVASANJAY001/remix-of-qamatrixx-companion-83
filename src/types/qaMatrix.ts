export interface TrimScores {
  T10: number | null;
  T20: number | null;
  T30: number | null;
  T40: number | null;
  T50: number | null;
  T60: number | null;
  T70: number | null;
  T80: number | null;
  T90: number | null;
  T100: number | null;
  TPQG: number | null;
}

export interface ChassisScores {
  C10: number | null;
  C20: number | null;
  C30: number | null;
  C40: number | null;
  C45: number | null;
  P10: number | null;
  P20: number | null;
  P30: number | null;
  C50: number | null;
  C60: number | null;
  C70: number | null;
  RSub: number | null;
  TS: number | null;
  C80: number | null;
  CPQG: number | null;
}

export interface FinalScores {
  F10: number | null;
  F20: number | null;
  F30: number | null;
  F40: number | null;
  F50: number | null;
  F60: number | null;
  F70: number | null;
  F80: number | null;
  F90: number | null;
  F100: number | null;
  FPQG: number | null;
  ResidualTorque: number | null;
}

export interface QControlScores {
  freqControl_1_1: number | null;
  visualControl_1_2: number | null;
  periodicAudit_1_3: number | null;
  humanControl_1_4: number | null;
  saeAlert_3_1: number | null;
  freqMeasure_3_2: number | null;
  manualTool_3_3: number | null;
  humanTracking_3_4: number | null;
  autoControl_5_1: number | null;
  impossibility_5_2: number | null;
  saeProhibition_5_3: number | null;
}

export interface QControlDetail {
  CVT: number | null;
  SHOWER: number | null;
  DynamicUB: number | null;
  CC4: number | null;
}

export type Status = 'OK' | 'NG';

export interface ControlRating {
  MFG: number | null;
  Quality: number | null;
  Plant: number | null;
}

export interface GuaranteedQuality {
  Workstation: number | null;
  MFG: number | null;
  Plant: number | null;
}

export interface QAMatrixEntry {
  sNo: number;
  source: string;
  operationStation: string;
  designation: string;
  concern: string;
  defectRating: 1 | 3 | 5;
  recurrence: number;
  weeklyRecurrence: number[];
  recurrenceCountPlusDefect: number;
  trim: TrimScores;
  chassis: ChassisScores;
  final: FinalScores;
  qControl: QControlScores;
  qControlDetail: QControlDetail;
  controlRating: ControlRating;
  guaranteedQuality: GuaranteedQuality;
  workstationStatus: Status;
  mfgStatus: Status;
  plantStatus: Status;
  mfgAction: string;
  resp: string;
  target: string;
}
