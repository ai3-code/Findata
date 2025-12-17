'use client';

import { useState, useMemo } from 'react';
import { useSurgeryInsuranceMatrix, useFilterOptions } from '@/hooks/useAnalytics';
import { useFilters } from '@/hooks/useFilters';
import FilterPanel from '@/components/filters/FilterPanel';
import { formatCurrency, formatPercent, formatNumber, getCollectionRateColor } from '@/lib/utils';

interface BillingCategory {
  category: string;
  charges: number;
  payments: number;
  collection_rate: number;
}

interface CarrierMetrics {
  carrier: string;
  procedure_count: number;
  total_charges: number;
  total_payments: number;
  collection_rate: number;
  avg_days_to_payment: number | null;
  billing_categories: BillingCategory[];
}

interface SurgeryTypeData {
  type_code: string;
  surgery_type: string | null;
  procedure_count: number;
  total_charges: number;
  total_payments: number;
  collection_rate: number;
  avg_days_to_payment: number | null;
  carriers: CarrierMetrics[];
}

type SortField = 'type_code' | 'surgery_type' | 'carriers' | 'procedure_count' | 'total_charges' | 'total_payments' | 'collection_rate';
type SortDirection = 'asc' | 'desc';

export default function SurgeryInsurancePage() {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedCarriers, setExpandedCarriers] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('type_code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
  const { data: matrixData, isLoading } = useSurgeryInsuranceMatrix(filters);

  const sortedMatrixData = useMemo(() => {
    if (!matrixData) return [];
    return [...matrixData].sort((a: SurgeryTypeData, b: SurgeryTypeData) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'carriers') {
        aVal = a.carriers.length;
        bVal = b.carriers.length;
      } else if (sortField === 'surgery_type') {
        aVal = a.surgery_type || '';
        bVal = b.surgery_type || '';
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [matrixData, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const toggleExpand = (typeCode: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeCode)) {
      newExpanded.delete(typeCode);
    } else {
      newExpanded.add(typeCode);
    }
    setExpandedTypes(newExpanded);
  };

  const toggleCarrierExpand = (typeCode: string, carrier: string) => {
    const key = `${typeCode}:${carrier}`;
    const newExpanded = new Set(expandedCarriers);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCarriers(newExpanded);
  };

  const expandAll = () => {
    if (matrixData) {
      setExpandedTypes(new Set(matrixData.map((t: SurgeryTypeData) => t.type_code)));
    }
  };

  const collapseAll = () => {
    setExpandedTypes(new Set());
    setExpandedCarriers(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Surgery & Insurance Analysis</h1>
        <p className="text-gray-500">
          View collection rates by surgery type with insurance carrier and billing category breakdown
        </p>
      </div>

      {/* Filters */}
      <FilterPanel
        datePreset={datePreset}
        onDatePresetChange={applyDatePreset}
        selectedPatient={filters.patientId}
        onPatientChange={setPatient}
        selectedSurgeryType={filters.typeCode}
        onSurgeryTypeChange={setSurgeryType}
        selectedCarrier={filters.carrier}
        onCarrierChange={setCarrier}
        filterOptions={filterOptions}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : matrixData && matrixData.length > 0 ? (
        <>
          {/* Expand/Collapse Controls */}
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Collapse All
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-blue-50 border-blue-200">
              <p className="text-sm font-medium text-blue-700">Surgery Types</p>
              <p className="text-2xl font-bold text-blue-900">{matrixData.length}</p>
            </div>
            <div className="card bg-green-50 border-green-200">
              <p className="text-sm font-medium text-green-700">Total Procedures</p>
              <p className="text-2xl font-bold text-green-900">
                {formatNumber(matrixData.reduce((sum: number, t: SurgeryTypeData) => sum + t.procedure_count, 0))}
              </p>
            </div>
            <div className="card bg-purple-50 border-purple-200">
              <p className="text-sm font-medium text-purple-700">Total Charges</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(matrixData.reduce((sum: number, t: SurgeryTypeData) => sum + t.total_charges, 0))}
              </p>
            </div>
            <div className="card bg-orange-50 border-orange-200">
              <p className="text-sm font-medium text-orange-700">Total Payments</p>
              <p className="text-2xl font-bold text-orange-900">
                {formatCurrency(matrixData.reduce((sum: number, t: SurgeryTypeData) => sum + t.total_payments, 0))}
              </p>
            </div>
          </div>

          {/* Summary Table by Surgery Type */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Summary by Surgery Type
            </h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <button
                      onClick={() => handleSort('type_code')}
                      className="flex items-center gap-1 hover:text-primary-600"
                    >
                      Type
                      <SortIcon field="type_code" />
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleSort('surgery_type')}
                      className="flex items-center gap-1 hover:text-primary-600"
                    >
                      Surgery Name
                      <SortIcon field="surgery_type" />
                    </button>
                  </th>
                  <th className="text-right">
                    <button
                      onClick={() => handleSort('carriers')}
                      className="flex items-center gap-1 ml-auto hover:text-primary-600"
                    >
                      Carriers
                      <SortIcon field="carriers" />
                    </button>
                  </th>
                  <th className="text-right">
                    <button
                      onClick={() => handleSort('procedure_count')}
                      className="flex items-center gap-1 ml-auto hover:text-primary-600"
                    >
                      Procedures
                      <SortIcon field="procedure_count" />
                    </button>
                  </th>
                  <th className="text-right">
                    <button
                      onClick={() => handleSort('total_charges')}
                      className="flex items-center gap-1 ml-auto hover:text-primary-600"
                    >
                      Total Charges
                      <SortIcon field="total_charges" />
                    </button>
                  </th>
                  <th className="text-right">
                    <button
                      onClick={() => handleSort('total_payments')}
                      className="flex items-center gap-1 ml-auto hover:text-primary-600"
                    >
                      Total Payments
                      <SortIcon field="total_payments" />
                    </button>
                  </th>
                  <th className="text-right">
                    <button
                      onClick={() => handleSort('collection_rate')}
                      className="flex items-center gap-1 ml-auto hover:text-primary-600"
                    >
                      Collection Rate
                      <SortIcon field="collection_rate" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMatrixData.map((type: SurgeryTypeData) => (
                  <tr key={type.type_code}>
                    <td className="font-mono font-medium">{type.type_code}</td>
                    <td>{type.surgery_type || '-'}</td>
                    <td className="text-right">{type.carriers.length}</td>
                    <td className="text-right">{formatNumber(type.procedure_count)}</td>
                    <td className="text-right">{formatCurrency(type.total_charges)}</td>
                    <td className="text-right">{formatCurrency(type.total_payments)}</td>
                    <td className={`text-right font-medium ${getCollectionRateColor(type.collection_rate)}`}>
                      {formatPercent(type.collection_rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3}>Total</td>
                  <td className="text-right">
                    {formatNumber(matrixData.reduce((sum: number, t: SurgeryTypeData) => sum + t.procedure_count, 0))}
                  </td>
                  <td className="text-right">
                    {formatCurrency(matrixData.reduce((sum: number, t: SurgeryTypeData) => sum + t.total_charges, 0))}
                  </td>
                  <td className="text-right">
                    {formatCurrency(matrixData.reduce((sum: number, t: SurgeryTypeData) => sum + t.total_payments, 0))}
                  </td>
                  <td className="text-right">
                    {formatPercent(
                      (matrixData.reduce((sum: number, t: SurgeryTypeData) => sum + t.total_payments, 0) /
                        matrixData.reduce((sum: number, t: SurgeryTypeData) => sum + t.total_charges, 0)) *
                        100 || 0
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Surgery Types with Nested Carriers */}
          <div className="space-y-4">
            {sortedMatrixData.map((surgeryType: SurgeryTypeData) => {
              const isExpanded = expandedTypes.has(surgeryType.type_code);

              return (
                <div key={surgeryType.type_code} className="card overflow-hidden">
                  {/* Surgery Type Header (clickable) */}
                  <button
                    onClick={() => toggleExpand(surgeryType.type_code)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Expand Icon */}
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>

                      {/* Type Code Badge */}
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 font-mono font-bold rounded-md">
                        {surgeryType.type_code}
                      </span>

                      {/* Surgery Name */}
                      <span className="text-gray-700 font-medium">
                        {surgeryType.surgery_type || 'Unknown Surgery Type'}
                      </span>

                      {/* Carrier Count */}
                      <span className="text-sm text-gray-500">
                        ({surgeryType.carriers.length} carrier{surgeryType.carriers.length !== 1 ? 's' : ''})
                      </span>
                    </div>

                    {/* Summary Stats */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <span className="text-gray-500">Procedures: </span>
                        <span className="font-medium">{formatNumber(surgeryType.procedure_count)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">Charges: </span>
                        <span className="font-medium">{formatCurrency(surgeryType.total_charges)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">Payments: </span>
                        <span className="font-medium">{formatCurrency(surgeryType.total_payments)}</span>
                      </div>
                      <div className={`text-right font-bold ${getCollectionRateColor(surgeryType.collection_rate)}`}>
                        {formatPercent(surgeryType.collection_rate)}
                      </div>
                    </div>
                  </button>

                  {/* Carrier Breakdown (expandable) */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {surgeryType.carriers.map((carrier) => {
                        const carrierKey = `${surgeryType.type_code}:${carrier.carrier}`;
                        const isCarrierExpanded = expandedCarriers.has(carrierKey);
                        const hasBillingCategories = carrier.billing_categories && carrier.billing_categories.length > 0;

                        return (
                          <div key={carrier.carrier} className="border-b border-gray-100 last:border-b-0">
                            {/* Carrier Row */}
                            <div
                              className={`flex items-center justify-between px-6 py-3 bg-gray-50 ${hasBillingCategories ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                              onClick={() => hasBillingCategories && toggleCarrierExpand(surgeryType.type_code, carrier.carrier)}
                            >
                              <div className="flex items-center gap-3">
                                {hasBillingCategories && (
                                  <svg
                                    className={`w-4 h-4 text-gray-400 transition-transform ${isCarrierExpanded ? 'rotate-90' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                                {!hasBillingCategories && <span className="w-4" />}
                                <span className="text-sm font-medium text-gray-900">{carrier.carrier}</span>
                                {hasBillingCategories && (
                                  <span className="text-xs text-gray-500">
                                    ({carrier.billing_categories.length} categories)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-6 text-sm">
                                <span className="text-gray-600 w-20 text-right">
                                  {formatNumber(carrier.procedure_count)} proc
                                </span>
                                <span className="text-gray-700 w-28 text-right">
                                  {formatCurrency(carrier.total_charges)}
                                </span>
                                <span className="text-gray-700 w-28 text-right">
                                  {formatCurrency(carrier.total_payments)}
                                </span>
                                <span className={`font-medium w-16 text-right ${getCollectionRateColor(carrier.collection_rate)}`}>
                                  {formatPercent(carrier.collection_rate)}
                                </span>
                                <span className="text-gray-600 w-16 text-right">
                                  {carrier.avg_days_to_payment?.toFixed(0) || 'N/A'} days
                                </span>
                              </div>
                            </div>

                            {/* Billing Categories (nested under carrier) */}
                            {isCarrierExpanded && hasBillingCategories && (
                              <div className="bg-white">
                                <table className="w-full">
                                  <thead>
                                    <tr className="text-xs text-gray-500 uppercase bg-gray-100">
                                      <th className="pl-16 pr-4 py-2 text-left">Billing Category</th>
                                      <th className="px-4 py-2 text-right">Charges</th>
                                      <th className="px-4 py-2 text-right">Payments</th>
                                      <th className="px-4 py-2 text-right">Collection Rate</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {carrier.billing_categories.map((bc) => (
                                      <tr key={bc.category} className="hover:bg-gray-50">
                                        <td className="pl-16 pr-4 py-2 text-sm text-gray-700">
                                          {bc.category}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">
                                          {formatCurrency(bc.charges)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">
                                          {formatCurrency(bc.payments)}
                                        </td>
                                        <td className={`px-4 py-2 text-sm text-right font-medium ${getCollectionRateColor(bc.collection_rate)}`}>
                                          {formatPercent(bc.collection_rate)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No data available. Upload data to see analysis.</p>
        </div>
      )}
    </div>
  );
}
