import { useState, useEffect, useCallback } from "react";
import { QAMatrixEntry } from "@/types/qaMatrix";
import { loadFromExcel } from "@/utils/xlsxImport";

const STORAGE_KEY = "qa-matrix-data";

export function usePersistedData() {
  const [data, setData] = useState<QAMatrixEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setData(JSON.parse(stored));
        setLoading(false);
        return;
      } catch {
        // fall through to Excel load
      }
    }
    loadFromExcel("/qa.xlsx")
      .then(entries => {
        setData(entries);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load Excel data:", err);
        setLoading(false);
      });
  }, []);

  const updateData = useCallback((updater: (prev: QAMatrixEntry[]) => QAMatrixEntry[]) => {
    setData(prev => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetToExcel = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLoading(true);
    loadFromExcel("/qa.xlsx").then(entries => {
      setData(entries);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      setLoading(false);
    });
  }, []);

  return { data, loading, updateData, resetToExcel };
}
