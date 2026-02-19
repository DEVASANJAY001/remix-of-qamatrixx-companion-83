import { QAMatrixEntry, Status } from "@/types/qaMatrix";

const sumNonNull = (values: (number | null)[]): number =>
  values.reduce<number>((acc, v) => acc + (v ?? 0), 0);

export function recalculateStatuses(entry: QAMatrixEntry): QAMatrixEntry {
  const dr = entry.defectRating;
  const hasRecurrence = entry.weeklyRecurrence.some(w => w > 0);
  const recurrence = entry.weeklyRecurrence.reduce((a, b) => a + b, 0);
  const recurrenceCountPlusDefect = dr + recurrence;

  const trimValues = Object.values(entry.trim);
  const chassisValues = Object.values(entry.chassis);
  const { ResidualTorque, ...finalWithoutRT } = entry.final;
  const finalValues = Object.values(finalWithoutRT);
  const mfgRating = sumNonNull([...trimValues, ...chassisValues, ...finalValues]);

  const qControlValues = Object.values(entry.qControl);
  const qualityRating = sumNonNull(qControlValues);

  const qControlDetailValues = Object.values(entry.qControlDetail);
  const plantRating = sumNonNull([ResidualTorque, ...qControlValues, ...qControlDetailValues]);

  const wsStatus: Status = hasRecurrence ? "NG" : (mfgRating >= dr ? "OK" : "NG");
  const mfgStatus: Status = mfgRating >= dr ? "OK" : "NG";
  const plantStatus: Status = plantRating >= dr ? "OK" : "NG";

  return {
    ...entry,
    recurrence,
    recurrenceCountPlusDefect,
    controlRating: { MFG: mfgRating, Quality: qualityRating, Plant: plantRating },
    workstationStatus: wsStatus,
    mfgStatus,
    plantStatus,
  };
}
