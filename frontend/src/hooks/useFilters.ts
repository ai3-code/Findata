'use client';

import { useState, useCallback, useMemo } from 'react';
import type { DateRangeFilter, DatePreset } from '@/types';
import { getDateRangeFromPreset } from '@/lib/utils';

export function useFilters(initialFilters: DateRangeFilter = {}) {
  const [filters, setFilters] = useState<DateRangeFilter>(initialFilters);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');

  const updateFilter = useCallback(
    <K extends keyof DateRangeFilter>(key: K, value: DateRangeFilter[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    setDatePreset('all');
  }, []);

  const applyDatePreset = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    const { dateFrom, dateTo } = getDateRangeFromPreset(preset);
    setFilters((prev) => ({
      ...prev,
      dateFrom,
      dateTo,
    }));
  }, []);

  const setPatient = useCallback((patientId: number | undefined) => {
    setFilters((prev) => ({ ...prev, patientId }));
  }, []);

  const setSurgeryType = useCallback((typeCode: string | undefined) => {
    setFilters((prev) => ({ ...prev, typeCode }));
  }, []);

  const setCarrier = useCallback((carrier: string | undefined) => {
    setFilters((prev) => ({ ...prev, carrier }));
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.dateFrom !== undefined ||
      filters.dateTo !== undefined ||
      filters.patientId !== undefined ||
      filters.typeCode !== undefined ||
      filters.carrier !== undefined
    );
  }, [filters]);

  return {
    filters,
    datePreset,
    updateFilter,
    clearFilters,
    applyDatePreset,
    setPatient,
    setSurgeryType,
    setCarrier,
    hasActiveFilters,
  };
}
