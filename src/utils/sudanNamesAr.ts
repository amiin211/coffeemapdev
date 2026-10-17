'use client';

// Arabic names for Sudan's states and localities, from the OCHA COD-AB
// boundaries (adm1_name1 / adm2_name1), keyed by English name and by P-code.
// public/data/sudan_names_ar.json is generated from public/data/sdn_admin{1,2}.geojson.

import { useEffect, useState } from 'react';

interface SudanNamesAr {
  states: Record<string, string>;
  localities: Record<string, string>;
  pcodes: Record<string, string>;
}

let cache: Promise<SudanNamesAr> | null = null;

/** Name in the page language: Arabic from the lookup when `isAr`, else the English name. */
export function useSudanNames(isAr: boolean) {
  const [names, setNames] = useState<SudanNamesAr | null>(null);
  useEffect(() => {
    if (!isAr) return;
    cache ??= fetch('/data/sudan_names_ar.json').then((r) => r.json());
    cache.then(setNames).catch(() => {});
  }, [isAr]);
  return {
    state: (name: string) => (isAr && names?.states[name]) || name,
    locality: (name: string) => (isAr && names?.localities[name]) || name,
    pcode: (pcode: string, fallback: string) => (isAr && names?.pcodes[pcode]) || fallback,
  };
}
