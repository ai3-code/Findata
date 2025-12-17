'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { proceduresApi } from '@/lib/api';
import { useFilters } from '@/hooks/useFilters';
import { useFilterOptions } from '@/hooks/useAnalytics';
import FilterPanel from '@/components/filters/FilterPanel';
import { formatCurrency, formatPercent, formatDate, getStatusColor } from '@/lib/utils';
import Link from 'next/link';

export default function ProceduresPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('date_of_service');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    filters,
    datePreset,
    applyDatePreset,
    setPatient,
    setSurgeryType,
    setCarrier,
    clearFilters,
    hasActiveFilters,
  } = useFilters();

  const { data: filterOptions } = useFilterOptions();
  const { data, isLoading } = useQuery({
    queryKey: ['procedures', filters, page, sortBy, sortOrder],
    queryFn: () => proceduresApi.getList(filters, page, 20, sortBy, sortOrder),
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return (
      <span className="ml-1">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procedures</h1>
        <p className="text-gray-500">
          View and filter all procedures
        </p>
      </div>

      {/* Filters */}
      <FilterPanel
        datePreset={datePreset}
        onDatePresetChange={(preset) => {
          applyDatePreset(preset);
          setPage(1);
        }}
        selectedPatient={filters.patientId}
        onPatientChange={(id) => {
          setPatient(id);
          setPage(1);
        }}
        selectedSurgeryType={filters.typeCode}
        onSurgeryTypeChange={(type) => {
          setSurgeryType(type);
          setPage(1);
        }}
        selectedCarrier={filters.carrier}
        onCarrierChange={(carrier) => {
          setCarrier(carrier);
          setPage(1);
        }}
        filterOptions={filterOptions}
        onClear={() => {
          clearFilters();
          setPage(1);
        }}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : data && data.procedures.length > 0 ? (
        <>
          {/* Summary */}
          <div className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, data.total)} of {data.total} procedures
          </div>

          {/* Table */}
          <div className="card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('procedure_id')}
                  >
                    Procedure ID <SortIcon column="procedure_id" />
                  </th>
                  <th
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('date_of_service')}
                  >
                    Date of Service <SortIcon column="date_of_service" />
                  </th>
                  <th>Patient</th>
                  <th>Surgery Type</th>
                  <th>Carrier</th>
                  <th
                    className="text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('total_charges')}
                  >
                    Charges <SortIcon column="total_charges" />
                  </th>
                  <th
                    className="text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('total_payments')}
                  >
                    Payments <SortIcon column="total_payments" />
                  </th>
                  <th
                    className="text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('collection_rate')}
                  >
                    Rate <SortIcon column="collection_rate" />
                  </th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.procedures.map((proc) => (
                  <tr key={proc.procedure_id}>
                    <td className="font-mono text-sm">{proc.procedure_id}</td>
                    <td>{formatDate(proc.date_of_service)}</td>
                    <td>{proc.chart_number || '-'}</td>
                    <td>{proc.type_code || '-'}</td>
                    <td className="max-w-[150px] truncate" title={proc.primary_carrier || ''}>
                      {proc.primary_carrier || '-'}
                    </td>
                    <td className="text-right">{formatCurrency(proc.total_charges)}</td>
                    <td className="text-right">{formatCurrency(proc.total_payments)}</td>
                    <td className="text-right">
                      {proc.collection_rate ? formatPercent(proc.collection_rate) : '-'}
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proc.status)}`}>
                        {proc.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/procedures/${proc.procedure_id}`}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {data.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.total_pages}
              className="btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No procedures found. Upload data to see procedures.</p>
        </div>
      )}
    </div>
  );
}
