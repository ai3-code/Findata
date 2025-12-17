'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, filtersApi } from '@/lib/api';
import type { DateRangeFilter } from '@/types';

export function useDashboard(filters: DateRangeFilter = {}) {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => analyticsApi.getDashboard(filters),
  });
}

export function useSurgeryTypeMetrics(filters: DateRangeFilter = {}) {
  return useQuery({
    queryKey: ['surgeryTypes', filters],
    queryFn: () => analyticsApi.getBySurgeryType(filters),
  });
}

export function useInsuranceMetrics(filters: DateRangeFilter = {}) {
  return useQuery({
    queryKey: ['insurance', filters],
    queryFn: () => analyticsApi.getByInsurance(filters),
  });
}

export function useRecoveryAnalysis(filters: DateRangeFilter = {}) {
  return useQuery({
    queryKey: ['recovery', filters],
    queryFn: () => analyticsApi.getRecovery(filters),
  });
}

export function useExpectedRecovery(typeCode?: string, carrier?: string) {
  return useQuery({
    queryKey: ['expectedRecovery', typeCode, carrier],
    queryFn: () => analyticsApi.getExpectedRecovery(typeCode, carrier),
  });
}

export function useTrends(
  filters: DateRangeFilter = {},
  granularity: 'day' | 'week' | 'month' = 'month'
) {
  return useQuery({
    queryKey: ['trends', filters, granularity],
    queryFn: () => analyticsApi.getTrends(filters, granularity),
  });
}

export function useDaysToPayment(filters: DateRangeFilter = {}) {
  return useQuery({
    queryKey: ['daysToPayment', filters],
    queryFn: () => analyticsApi.getDaysToPayment(filters),
  });
}

export function useAging(typeCode?: string, carrier?: string) {
  return useQuery({
    queryKey: ['aging', typeCode, carrier],
    queryFn: () => analyticsApi.getAging(typeCode, carrier),
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ['filterOptions'],
    queryFn: () => filtersApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSurgeryInsuranceMatrix(filters: DateRangeFilter = {}) {
  return useQuery({
    queryKey: ['surgeryInsuranceMatrix', filters],
    queryFn: () => analyticsApi.getSurgeryInsuranceMatrix(filters),
  });
}

export function usePatientSurgeryInsuranceMatrix(filters: DateRangeFilter = {}) {
  return useQuery({
    queryKey: ['patientSurgeryInsuranceMatrix', filters],
    queryFn: () => analyticsApi.getPatientSurgeryInsuranceMatrix(filters),
  });
}

export function useInsuranceSurgeryPatientMatrix(filters: DateRangeFilter = {}) {
  return useQuery({
    queryKey: ['insuranceSurgeryPatientMatrix', filters],
    queryFn: () => analyticsApi.getInsuranceSurgeryPatientMatrix(filters),
  });
}

export function useDynamicMatrix(groupBy: string[], filters: DateRangeFilter = {}) {
  return useQuery({
    queryKey: ['dynamicMatrix', groupBy, filters],
    queryFn: () => analyticsApi.getDynamicMatrix(groupBy, filters),
    enabled: groupBy.length > 0,
  });
}
