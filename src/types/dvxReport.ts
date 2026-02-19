export interface DVXEntry {
  date: string;
  locationDetails: string;
  defectCode: string;
  defectDescription: string;
  defectDescriptionDetails: string;
  gravity: string;
  quantity: number;
  source: string;
  responsible: string;
  pofFamily: string;
  pofCode: string;
}

export interface MatchedRepeat {
  dvxEntries: DVXEntry[];
  repeatCount: number;
  qaSNo: number;
  qaConcern: string;
  matchScore: number;
}

export interface UnmatchedDefect {
  dvxEntry: DVXEntry;
  id: string; // unique ID for drag/drop
}
