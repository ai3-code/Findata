'use client';

import { useState, useMemo } from 'react';
import { usePatientSurgeryInsuranceMatrix, useFilterOptions } from '@/hooks/useAnalytics';
import { useFilters } from '@/hooks/useFilters';
import FilterPanel from '@/components/filters/FilterPanel';
import { formatCurrency, formatPercent, formatNumber, formatDate, getCollectionRateColor } from '@/lib/utils';

interface CarrierMetrics {
  carrier: string;
  procedure_count: number;
  total_charges: number;
  total_payments: number;
  collection_rate: number;
  avg_days_to_payment: number | null;
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

interface PatientData {
  chart_number: number;
  procedure_count: number;
  total_charges: number;
  total_payments: number;
  collection_rate: number;
  first_visit: string | null;
  last_visit: string | null;
  surgery_types: SurgeryTypeData[];
}

type SortField = 'chart_number' | 'procedure_count' | 'total_charges' | 'total_payments' | 'collection_rate' | 'first_visit' | 'last_visit' | 'surgery_types';
type SortDirection = 'asc' | 'desc';

export default function PatientPage() {
  const [expandedPatients, setExpandedPatients] = useState<Set<number>>(new Set());
  const [expandedSurgeryTypes, setExpandedSurgeryTypes] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('total_charges');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
  const { data: matrixData, isLoading } = usePatientSurgeryInsuranceMatrix(filters);

  const sortedData = useMemo(() => {
    if (!matrixData) return [];
    return [...matrixData].sort((a: PatientData, b: PatientData) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'surgery_types') {
        aVal = a.surgery_types.length;
        bVal = b.surgery_types.length;
      } else if (sortField === 'first_visit' || sortField === 'last_visit') {
        aVal = a[sortField] ? new Date(a[sortField]!).getTime() : 0;
        bVal = b[sortField] ? new Date(b[sortField]!).getTime() : 0;
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
      setSortDirection('desc');
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

  const togglePatientExpand = (chartNumber: number) => {
    const newExpanded = new Set(expandedPatients);
    if (newExpanded.has(chartNumber)) {
      newExpanded.delete(chartNumber);
    } else {
      newExpanded.add(chartNumber);
    }
    setExpandedPatients(newExpanded);
  };

  const toggleSurgeryTypeExpand = (chartNumber: number, typeCode: string) => {
    const key = `${chartNumber}:${typeCode}`;
    const newExpanded = new Set(expandedSurgeryTypes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSurgeryTypes(newExpanded);
  };

  const expandAll = () => {
    if (matrixData) {
      setExpandedPatients(new Set(matrixData.map((p: PatientData) => p.chart_number)));
    }
  };

  const collapseAll = () => {
    setExpandedPatients(new Set());
    setExpandedSurgeryTypes(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patient Analysis</h1>
        <p className="text-gray-500">
          View billing data by patient with surgery type and insurance carrier breakdown
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
              <p className="text-sm font-medium text-blue-700">Total Patients</p>
              <p className="text-2xl font-bold text-blue-900">{matrixData.length}</p>
            </div>
            <div className="card bg-green-50 border-green-200">
              <p className="text-sm font-medium text-green-700">Total Procedures</p>
              <p className="text-2xl font-bold text-green-900">
                {formatNumber(matrixData.reduce((sum: number, p: PatientData) => sum + p.procedure_count, 0))}
              </p>
            </div>
            <div className="card bg-purple-50 border-purple-200">
              <p className="text-sm font-medium text-purple-700">Total Charges</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(matrixData.reduce((sum: number, p: PatientData) => sum + p.total_charges, 0))}
              </p>
            </div>
            <div className="card bg-orange-50 border-orange-200">
              <p className="text-sm font-medium text-orange-700">Total Payments</p>
              <p className="text-2xl font-bold text-orange-900">
                {formatCurrency(matrixData.reduce((sum: number, p: PatientData) => sum + p.total_payments, 0))}
              </p>
            </div>
          </div>

          {/* Summary Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary by Patient</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <button onClick={() => handleSort('chart_number')} className="flex items-center gap-1 hover:text-primary-600">
                      Patient ID <SortIcon field="chart_number" />
                    </button>
                  </th>
                  <th className="text-right">
                    <button onClick={() => handleSort('surgery_types')} className="flex items-center gap-1 ml-auto hover:text-primary-600">
                      Surgery Types <SortIcon field="surgery_types" />
                    </button>
                  </th>
                  <th className="text-right">
                    <button onClick={() => handleSort('procedure_count')} className="flex items-center gap-1 ml-auto hover:text-primary-600">
                      Procedures <SortIcon field="procedure_count" />
                    </button>
                  </th>
                  <th className="text-right">
                    <button onClick={() => handleSort('total_charges')} className="flex items-center gap-1 ml-auto hover:text-primary-600">
                      Total Charges <SortIcon field="total_charges" />
                    </button>
                  </th>
                  <th className="text-right">
                    <button onClick={() => handleSort('total_payments')} className="flex items-center gap-1 ml-auto hover:text-primary-600">
                      Total Payments <SortIcon field="total_payments" />
                    </button>
                  </th>
                  <th className="text-right">
                    <button onClick={() => handleSort('collection_rate')} className="flex items-center gap-1 ml-auto hover:text-primary-600">
                      Collection Rate <SortIcon field="collection_rate" />
                    </button>
                  </th>
                  <th>
                    <button onClick={() => handleSort('first_visit')} className="flex items-center gap-1 hover:text-primary-600">
                      First Visit <SortIcon field="first_visit" />
                    </button>
                  </th>
                  <th>
                    <button onClick={() => handleSort('last_visit')} className="flex items-center gap-1 hover:text-primary-600">
                      Last Visit <SortIcon field="last_visit" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((patient: PatientData) => (
                  <tr key={patient.chart_number}>
                    <td className="font-medium">{patient.chart_number}</td>
                    <td className="text-right">{patient.surgery_types.length}</td>
                    <td className="text-right">{formatNumber(patient.procedure_count)}</td>
                    <td className="text-right">{formatCurrency(patient.total_charges)}</td>
                    <td className="text-right">{formatCurrency(patient.total_payments)}</td>
                    <td className={`text-right font-medium ${getCollectionRateColor(patient.collection_rate)}`}>
                      {formatPercent(patient.collection_rate)}
                    </td>
                    <td>{patient.first_visit ? formatDate(patient.first_visit) : '-'}</td>
                    <td>{patient.last_visit ? formatDate(patient.last_visit) : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td>Total</td>
                  <td className="text-right">-</td>
                  <td className="text-right">
                    {formatNumber(matrixData.reduce((sum: number, p: PatientData) => sum + p.procedure_count, 0))}
                  </td>
                  <td className="text-right">
                    {formatCurrency(matrixData.reduce((sum: number, p: PatientData) => sum + p.total_charges, 0))}
                  </td>
                  <td className="text-right">
                    {formatCurrency(matrixData.reduce((sum: number, p: PatientData) => sum + p.total_payments, 0))}
                  </td>
                  <td className="text-right">
                    {formatPercent(
                      (matrixData.reduce((sum: number, p: PatientData) => sum + p.total_payments, 0) /
                        matrixData.reduce((sum: number, p: PatientData) => sum + p.total_charges, 0)) *
                        100 || 0
                    )}
                  </td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Patients with Nested Surgery Types and Carriers */}
          <div className="space-y-4">
            {sortedData.map((patient: PatientData) => {
              const isExpanded = expandedPatients.has(patient.chart_number);

              return (
                <div key={patient.chart_number} className="card overflow-hidden">
                  {/* Patient Header (clickable) */}
                  <button
                    onClick={() => togglePatientExpand(patient.chart_number)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 font-mono font-bold rounded-md">
                        Patient {patient.chart_number}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({patient.surgery_types.length} surgery type{patient.surgery_types.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <span className="text-gray-500">Procedures: </span>
                        <span className="font-medium">{formatNumber(patient.procedure_count)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">Charges: </span>
                        <span className="font-medium">{formatCurrency(patient.total_charges)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500">Payments: </span>
                        <span className="font-medium">{formatCurrency(patient.total_payments)}</span>
                      </div>
                      <div className={`text-right font-bold ${getCollectionRateColor(patient.collection_rate)}`}>
                        {formatPercent(patient.collection_rate)}
                      </div>
                    </div>
                  </button>

                  {/* Surgery Types Breakdown (expandable) */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {patient.surgery_types.map((surgeryType) => {
                        const surgeryKey = `${patient.chart_number}:${surgeryType.type_code}`;
                        const isSurgeryExpanded = expandedSurgeryTypes.has(surgeryKey);
                        const hasCarriers = surgeryType.carriers && surgeryType.carriers.length > 0;

                        return (
                          <div key={surgeryType.type_code} className="border-b border-gray-100 last:border-b-0">
                            {/* Surgery Type Row */}
                            <div
                              className={`flex items-center justify-between px-6 py-3 bg-gray-50 ${hasCarriers ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                              onClick={() => hasCarriers && toggleSurgeryTypeExpand(patient.chart_number, surgeryType.type_code)}
                            >
                              <div className="flex items-center gap-3">
                                {hasCarriers && (
                                  <svg
                                    className={`w-4 h-4 text-gray-400 transition-transform ${isSurgeryExpanded ? 'rotate-90' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                                {!hasCarriers && <span className="w-4" />}
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 font-mono text-sm rounded">
                                  {surgeryType.type_code}
                                </span>
                                <span className="text-sm text-gray-700">{surgeryType.surgery_type || 'Unknown'}</span>
                                {hasCarriers && (
                                  <span className="text-xs text-gray-500">
                                    ({surgeryType.carriers.length} carrier{surgeryType.carriers.length !== 1 ? 's' : ''})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-6 text-sm">
                                <span className="text-gray-600 w-20 text-right">
                                  {formatNumber(surgeryType.procedure_count)} proc
                                </span>
                                <span className="text-gray-700 w-28 text-right">
                                  {formatCurrency(surgeryType.total_charges)}
                                </span>
                                <span className="text-gray-700 w-28 text-right">
                                  {formatCurrency(surgeryType.total_payments)}
                                </span>
                                <span className={`font-medium w-16 text-right ${getCollectionRateColor(surgeryType.collection_rate)}`}>
                                  {formatPercent(surgeryType.collection_rate)}
                                </span>
                              </div>
                            </div>

                            {/* Carriers (nested under surgery type) */}
                            {isSurgeryExpanded && hasCarriers && (
                              <div className="bg-white">
                                <table className="w-full">
                                  <thead>
                                    <tr className="text-xs text-gray-500 uppercase bg-gray-100">
                                      <th className="pl-16 pr-4 py-2 text-left">Insurance Carrier</th>
                                      <th className="px-4 py-2 text-right">Procedures</th>
                                      <th className="px-4 py-2 text-right">Charges</th>
                                      <th className="px-4 py-2 text-right">Payments</th>
                                      <th className="px-4 py-2 text-right">Collection Rate</th>
                                      <th className="px-4 py-2 text-right">Avg Days</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {surgeryType.carriers.map((carrier) => (
                                      <tr key={carrier.carrier} className="hover:bg-gray-50">
                                        <td className="pl-16 pr-4 py-2 text-sm text-gray-700">{carrier.carrier}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">
                                          {formatNumber(carrier.procedure_count)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">
                                          {formatCurrency(carrier.total_charges)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">
                                          {formatCurrency(carrier.total_payments)}
                                        </td>
                                        <td className={`px-4 py-2 text-sm text-right font-medium ${getCollectionRateColor(carrier.collection_rate)}`}>
                                          {formatPercent(carrier.collection_rate)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-600">
                                          {carrier.avg_days_to_payment?.toFixed(0) || 'N/A'}
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
