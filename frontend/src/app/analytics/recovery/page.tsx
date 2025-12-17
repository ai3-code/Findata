'use client';

import { useState, useMemo } from 'react';
import { useRecoveryAnalysis, useFilterOptions } from '@/hooks/useAnalytics';
import { useFilters } from '@/hooks/useFilters';
import FilterPanel from '@/components/filters/FilterPanel';
import BarChart from '@/components/charts/BarChart';
import { formatPercent, formatCurrency } from '@/lib/utils';

type TypeSortField = 'type_code' | 'recovery_1_month' | 'recovery_3_month' | 'recovery_6_month' | 'recovery_12_month';
type CarrierSortField = 'carrier' | 'recovery_1_month' | 'recovery_3_month' | 'recovery_6_month' | 'recovery_12_month';
type SortDirection = 'asc' | 'desc';

export default function RecoveryPage() {
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
  const { data: recovery, isLoading } = useRecoveryAnalysis(filters);

  // Sorting state for surgery type table
  const [typeSortField, setTypeSortField] = useState<TypeSortField>('type_code');
  const [typeSortDirection, setTypeSortDirection] = useState<SortDirection>('asc');

  // Sorting state for carrier table
  const [carrierSortField, setCarrierSortField] = useState<CarrierSortField>('carrier');
  const [carrierSortDirection, setCarrierSortDirection] = useState<SortDirection>('asc');

  const sortedTypes = useMemo(() => {
    if (!recovery?.breakdown_by_type) return [];
    return [...recovery.breakdown_by_type].sort((a, b) => {
      const aVal = a[typeSortField];
      const bVal = b[typeSortField];
      if (aVal < bVal) return typeSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return typeSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [recovery?.breakdown_by_type, typeSortField, typeSortDirection]);

  const sortedCarriers = useMemo(() => {
    if (!recovery?.breakdown_by_carrier) return [];
    return [...recovery.breakdown_by_carrier].sort((a, b) => {
      const aVal = a[carrierSortField];
      const bVal = b[carrierSortField];
      if (aVal < bVal) return carrierSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return carrierSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [recovery?.breakdown_by_carrier, carrierSortField, carrierSortDirection]);

  const handleTypeSort = (field: TypeSortField) => {
    if (typeSortField === field) {
      setTypeSortDirection(typeSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setTypeSortField(field);
      setTypeSortDirection('asc');
    }
  };

  const handleCarrierSort = (field: CarrierSortField) => {
    if (carrierSortField === field) {
      setCarrierSortDirection(carrierSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCarrierSortField(field);
      setCarrierSortDirection('asc');
    }
  };

  const TypeSortIcon = ({ field }: { field: TypeSortField }) => {
    if (typeSortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return typeSortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const CarrierSortIcon = ({ field }: { field: CarrierSortField }) => {
    if (carrierSortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return carrierSortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Recovery Analysis</h1>
        <p className="text-gray-500">
          Track payment recovery rates at 1, 3, 6, and 12 months from date of service
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
          <p className="text-gray-500">Loading recovery data...</p>
        </div>
      ) : recovery ? (
        <>
          {/* Recovery Rate Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RecoveryCard
              title="1 Month"
              rate={recovery.recovery_1_month}
              color="blue"
            />
            <RecoveryCard
              title="3 Months"
              rate={recovery.recovery_3_month}
              color="green"
            />
            <RecoveryCard
              title="6 Months"
              rate={recovery.recovery_6_month}
              color="yellow"
            />
            <RecoveryCard
              title="12 Months"
              rate={recovery.recovery_12_month}
              color="purple"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Surgery Type */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recovery by Surgery Type
              </h3>
              {recovery.breakdown_by_type && recovery.breakdown_by_type.length > 0 ? (
                <BarChart
                  data={recovery.breakdown_by_type}
                  xKey="type_code"
                  bars={[
                    { dataKey: 'recovery_1_month', name: '1 Month', color: '#3b82f6' },
                    { dataKey: 'recovery_3_month', name: '3 Months', color: '#10b981' },
                    { dataKey: 'recovery_6_month', name: '6 Months', color: '#f59e0b' },
                    { dataKey: 'recovery_12_month', name: '12 Months', color: '#8b5cf6' },
                  ]}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                />
              ) : (
                <p className="text-gray-500 text-center py-12">No data available</p>
              )}
            </div>

            {/* By Insurance */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recovery by Insurance Carrier
              </h3>
              {recovery.breakdown_by_carrier && recovery.breakdown_by_carrier.length > 0 ? (
                <BarChart
                  data={recovery.breakdown_by_carrier.slice(0, 8)}
                  xKey="carrier"
                  bars={[
                    { dataKey: 'recovery_1_month', name: '1 Month', color: '#3b82f6' },
                    { dataKey: 'recovery_3_month', name: '3 Months', color: '#10b981' },
                    { dataKey: 'recovery_6_month', name: '6 Months', color: '#f59e0b' },
                    { dataKey: 'recovery_12_month', name: '12 Months', color: '#8b5cf6' },
                  ]}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                  height={350}
                />
              ) : (
                <p className="text-gray-500 text-center py-12">No data available</p>
              )}
            </div>
          </div>

          {/* Detailed Table - Surgery Type */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recovery Rates by Surgery Type
            </h3>
            {sortedTypes.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <button
                        onClick={() => handleTypeSort('type_code')}
                        className="flex items-center gap-1 hover:text-primary-600"
                      >
                        Surgery Type
                        <TypeSortIcon field="type_code" />
                      </button>
                    </th>
                    <th className="text-right">
                      <button
                        onClick={() => handleTypeSort('recovery_1_month')}
                        className="flex items-center gap-1 ml-auto hover:text-primary-600"
                      >
                        1 Month
                        <TypeSortIcon field="recovery_1_month" />
                      </button>
                    </th>
                    <th className="text-right">
                      <button
                        onClick={() => handleTypeSort('recovery_3_month')}
                        className="flex items-center gap-1 ml-auto hover:text-primary-600"
                      >
                        3 Months
                        <TypeSortIcon field="recovery_3_month" />
                      </button>
                    </th>
                    <th className="text-right">
                      <button
                        onClick={() => handleTypeSort('recovery_6_month')}
                        className="flex items-center gap-1 ml-auto hover:text-primary-600"
                      >
                        6 Months
                        <TypeSortIcon field="recovery_6_month" />
                      </button>
                    </th>
                    <th className="text-right">
                      <button
                        onClick={() => handleTypeSort('recovery_12_month')}
                        className="flex items-center gap-1 ml-auto hover:text-primary-600"
                      >
                        12 Months
                        <TypeSortIcon field="recovery_12_month" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTypes.map((item) => (
                    <tr key={item.type_code}>
                      <td className="font-medium">{item.type_code}</td>
                      <td className="text-right">{formatPercent(item.recovery_1_month)}</td>
                      <td className="text-right">{formatPercent(item.recovery_3_month)}</td>
                      <td className="text-right">{formatPercent(item.recovery_6_month)}</td>
                      <td className="text-right">{formatPercent(item.recovery_12_month)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>

          {/* Detailed Table - Insurance */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recovery Rates by Insurance Carrier
            </h3>
            {sortedCarriers.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <button
                        onClick={() => handleCarrierSort('carrier')}
                        className="flex items-center gap-1 hover:text-primary-600"
                      >
                        Carrier
                        <CarrierSortIcon field="carrier" />
                      </button>
                    </th>
                    <th className="text-right">
                      <button
                        onClick={() => handleCarrierSort('recovery_1_month')}
                        className="flex items-center gap-1 ml-auto hover:text-primary-600"
                      >
                        1 Month
                        <CarrierSortIcon field="recovery_1_month" />
                      </button>
                    </th>
                    <th className="text-right">
                      <button
                        onClick={() => handleCarrierSort('recovery_3_month')}
                        className="flex items-center gap-1 ml-auto hover:text-primary-600"
                      >
                        3 Months
                        <CarrierSortIcon field="recovery_3_month" />
                      </button>
                    </th>
                    <th className="text-right">
                      <button
                        onClick={() => handleCarrierSort('recovery_6_month')}
                        className="flex items-center gap-1 ml-auto hover:text-primary-600"
                      >
                        6 Months
                        <CarrierSortIcon field="recovery_6_month" />
                      </button>
                    </th>
                    <th className="text-right">
                      <button
                        onClick={() => handleCarrierSort('recovery_12_month')}
                        className="flex items-center gap-1 ml-auto hover:text-primary-600"
                      >
                        12 Months
                        <CarrierSortIcon field="recovery_12_month" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCarriers.map((item) => (
                    <tr key={item.carrier}>
                      <td className="font-medium">{item.carrier}</td>
                      <td className="text-right">{formatPercent(item.recovery_1_month)}</td>
                      <td className="text-right">{formatPercent(item.recovery_3_month)}</td>
                      <td className="text-right">{formatPercent(item.recovery_6_month)}</td>
                      <td className="text-right">{formatPercent(item.recovery_12_month)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No data available. Upload data to see recovery analysis.</p>
        </div>
      )}
    </div>
  );
}

// Recovery Card Component
function RecoveryCard({
  title,
  rate,
  color,
}: {
  title: string;
  rate: { percent: number; amount: number; procedures: number };
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  const textClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={`card ${colorClasses[color]}`}>
      <p className="text-sm font-medium text-gray-600">{title} Recovery</p>
      <p className={`text-4xl font-bold mt-2 ${textClasses[color]}`}>
        {formatPercent(rate.percent)}
      </p>
      <div className="mt-3 text-sm text-gray-500">
        <p>{formatCurrency(rate.amount)} recovered</p>
        <p>from {rate.procedures} procedures</p>
      </div>
    </div>
  );
}
