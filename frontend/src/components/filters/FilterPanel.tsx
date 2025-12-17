'use client';

import { cn } from '@/lib/utils';
import type { DatePreset, FilterOptions } from '@/types';

interface FilterPanelProps {
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  selectedPatient?: number;
  onPatientChange: (patientId: number | undefined) => void;
  selectedSurgeryType?: string;
  onSurgeryTypeChange: (typeCode: string | undefined) => void;
  selectedCarrier?: string;
  onCarrierChange: (carrier: string | undefined) => void;
  filterOptions?: FilterOptions;
  onClear: () => void;
  hasActiveFilters: boolean;
}

const datePresets: { value: DatePreset; label: string }[] = [
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '9m', label: '9M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

export default function FilterPanel({
  datePreset,
  onDatePresetChange,
  selectedPatient,
  onPatientChange,
  selectedSurgeryType,
  onSurgeryTypeChange,
  selectedCarrier,
  onCarrierChange,
  filterOptions,
  onClear,
  hasActiveFilters,
}: FilterPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
      {/* Date Presets */}
      <div className="flex items-center gap-1">
        {datePresets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onDatePresetChange(preset.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              datePreset === preset.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-gray-200" />

      {/* Patient Filter */}
      <select
        value={selectedPatient || ''}
        onChange={(e) => onPatientChange(e.target.value ? Number(e.target.value) : undefined)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="">All Patients</option>
        {filterOptions?.patients.map((patient) => (
          <option key={patient.value} value={patient.value}>
            Patient {patient.value} ({patient.count})
          </option>
        ))}
      </select>

      {/* Surgery Type Filter */}
      <select
        value={selectedSurgeryType || ''}
        onChange={(e) => onSurgeryTypeChange(e.target.value || undefined)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="">All Surgery Types</option>
        {filterOptions?.surgery_types.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label} ({type.count})
          </option>
        ))}
      </select>

      {/* Insurance Carrier Filter */}
      <select
        value={selectedCarrier || ''}
        onChange={(e) => onCarrierChange(e.target.value || undefined)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="">All Carriers</option>
        {filterOptions?.carriers.map((carrier) => (
          <option key={carrier.value} value={carrier.value}>
            {carrier.label} ({carrier.count})
          </option>
        ))}
      </select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
