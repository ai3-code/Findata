'use client';

import { useState, useMemo } from 'react';
import { useInsuranceSurgeryPatientMatrix } from '@/hooks/useAnalytics';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface PatientData {
  chart_number: number;
  procedure_count: number;
  total_charges: number;
  total_payments: number;
  collection_rate: number;
}

interface SurgeryTypeData {
  type_code: string;
  type_name: string;
  procedure_count: number;
  total_charges: number;
  total_payments: number;
  collection_rate: number;
  patients: PatientData[];
}

interface CarrierData {
  carrier: string;
  procedure_count: number;
  total_charges: number;
  total_payments: number;
  collection_rate: number;
  surgery_types: SurgeryTypeData[];
}

type SortField = 'carrier' | 'procedure_count' | 'total_charges' | 'total_payments' | 'collection_rate' | 'surgery_types';
type SortOrder = 'asc' | 'desc';

const dateRangeOptions = [
  { label: '3M', value: '3m', days: 90 },
  { label: '6M', value: '6m', days: 180 },
  { label: '9M', value: '9m', days: 270 },
  { label: '1Y', value: '1y', days: 365 },
  { label: 'All', value: 'all', days: null },
];

export default function InsuranceAnalysisPage() {
  const [dateRange, setDateRange] = useState('all');
  const [expandedCarriers, setExpandedCarriers] = useState<Set<string>>(new Set());
  const [expandedSurgeryTypes, setExpandedSurgeryTypes] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('total_charges');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const selectedRange = dateRangeOptions.find(r => r.value === dateRange);
  const filters = useMemo(() => {
    if (!selectedRange?.days) return {};
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - selectedRange.days);
    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
    };
  }, [selectedRange]);

  const { data: carrierData, isLoading, error } = useInsuranceSurgeryPatientMatrix(filters);

  const toggleCarrier = (carrier: string) => {
    setExpandedCarriers(prev => {
      const next = new Set(prev);
      if (next.has(carrier)) {
        next.delete(carrier);
      } else {
        next.add(carrier);
      }
      return next;
    });
  };

  const toggleSurgeryType = (carrier: string, typeCode: string) => {
    const key = `${carrier}:${typeCode}`;
    setExpandedSurgeryTypes(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!carrierData) return [];
    const sorted = [...carrierData] as CarrierData[];
    sorted.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortField === 'surgery_types') {
        aVal = a.surgery_types?.length || 0;
        bVal = b.surgery_types?.length || 0;
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [carrierData, sortField, sortOrder]);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Failed to load insurance analysis data
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Insurance Analysis</h1>
        <div className="flex items-center gap-2">
          {dateRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                dateRange === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Insurance Carrier → Surgery Type → Patient Breakdown
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Click on a carrier to see surgery types, then click on a surgery type to see patients
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-8"></th>
                  <SortHeader field="carrier">Carrier</SortHeader>
                  <SortHeader field="surgery_types">Surgery Types</SortHeader>
                  <SortHeader field="procedure_count">Procedures</SortHeader>
                  <SortHeader field="total_charges">Total Charges</SortHeader>
                  <SortHeader field="total_payments">Total Payments</SortHeader>
                  <SortHeader field="collection_rate">Collection Rate</SortHeader>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((carrier: CarrierData) => (
                  <>
                    <tr
                      key={carrier.carrier}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleCarrier(carrier.carrier)}
                    >
                      <td className="px-2 py-4 text-center">
                        <span className="text-gray-400">
                          {expandedCarriers.has(carrier.carrier) ? '▼' : '▶'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{carrier.carrier}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {carrier.surgery_types?.length || 0}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {carrier.procedure_count}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(carrier.total_charges)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(carrier.total_payments)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          carrier.collection_rate >= 80 ? 'text-green-600' :
                          carrier.collection_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPercent(carrier.collection_rate)}
                        </span>
                      </td>
                    </tr>
                    {expandedCarriers.has(carrier.carrier) && carrier.surgery_types?.map((surgeryType: SurgeryTypeData) => (
                      <>
                        <tr
                          key={`${carrier.carrier}-${surgeryType.type_code}`}
                          className="bg-blue-50 hover:bg-blue-100 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSurgeryType(carrier.carrier, surgeryType.type_code);
                          }}
                        >
                          <td className="px-2 py-3 text-center">
                            <span className="text-blue-400 text-sm">
                              {expandedSurgeryTypes.has(`${carrier.carrier}:${surgeryType.type_code}`) ? '▼' : '▶'}
                            </span>
                          </td>
                          <td className="px-4 py-3 pl-10 whitespace-nowrap">
                            <span className="text-sm text-blue-800">
                              {surgeryType.type_code} - {surgeryType.type_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">
                            {surgeryType.patients?.length || 0} patients
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">
                            {surgeryType.procedure_count}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-800">
                            {formatCurrency(surgeryType.total_charges)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-800">
                            {formatCurrency(surgeryType.total_payments)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-sm font-medium ${
                              surgeryType.collection_rate >= 80 ? 'text-green-600' :
                              surgeryType.collection_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {formatPercent(surgeryType.collection_rate)}
                            </span>
                          </td>
                        </tr>
                        {expandedSurgeryTypes.has(`${carrier.carrier}:${surgeryType.type_code}`) && surgeryType.patients?.map((patient: PatientData) => (
                          <tr
                            key={`${carrier.carrier}-${surgeryType.type_code}-${patient.chart_number}`}
                            className="bg-green-50"
                          >
                            <td className="px-2 py-2"></td>
                            <td className="px-4 py-2 pl-16 whitespace-nowrap">
                              <span className="text-sm text-green-800">
                                Patient #{patient.chart_number}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600">
                              -
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600">
                              {patient.procedure_count}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-green-800">
                              {formatCurrency(patient.total_charges)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-green-800">
                              {formatCurrency(patient.total_payments)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span className={`text-sm font-medium ${
                                patient.collection_rate >= 80 ? 'text-green-600' :
                                patient.collection_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {formatPercent(patient.collection_rate)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
