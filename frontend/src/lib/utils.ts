import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, subDays, subMonths, subYears } from 'date-fns';
import type { DatePreset } from '@/types';

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format percentage
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Format number with commas
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

// Format date
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

// Format date for API
export function formatDateForApi(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Get date range from preset
export function getDateRangeFromPreset(preset: DatePreset): {
  dateFrom: string | undefined;
  dateTo: string | undefined;
} {
  const today = new Date();
  const dateTo = formatDateForApi(today);

  switch (preset) {
    case '3m':
      return { dateFrom: formatDateForApi(subMonths(today, 3)), dateTo };
    case '6m':
      return { dateFrom: formatDateForApi(subMonths(today, 6)), dateTo };
    case '9m':
      return { dateFrom: formatDateForApi(subMonths(today, 9)), dateTo };
    case '1y':
      return { dateFrom: formatDateForApi(subYears(today, 1)), dateTo };
    case 'all':
    default:
      return { dateFrom: undefined, dateTo: undefined };
  }
}

// Get status color
export function getStatusColor(status: string): string {
  switch (status) {
    case 'collected':
      return 'bg-green-100 text-green-800';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending':
      return 'bg-blue-100 text-blue-800';
    case 'written_off':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Get collection rate color
export function getCollectionRateColor(rate: number): string {
  if (rate >= 90) return 'text-green-600';
  if (rate >= 70) return 'text-yellow-600';
  if (rate >= 50) return 'text-orange-600';
  return 'text-red-600';
}

// Chart colors
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
];

// Get color for index
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
