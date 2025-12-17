'use client';

import { useSurgeryTypeMetrics, useFilterOptions } from '@/hooks/useAnalytics';
import { useFilters } from '@/hooks/useFilters';
import FilterPanel from '@/components/filters/FilterPanel';
import BarChart from '@/components/charts/BarChart';
import PieChart from '@/components/charts/PieChart';
import { formatCurrency, formatPercent, formatNumber, getCollectionRateColor } from '@/lib/utils';

export default function SurgeryTypePage() {
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
  const { data: surgeryTypes, isLoading } = useSurgeryTypeMetrics(filters);

  // Prepare pie chart data
  const pieData = surgeryTypes?.map((type) => ({
    name: type.type_code,
    value: type.total_charges,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Surgery Type Analysis</h1>
        <p className="text-gray-500">
          Analyze charges, payments, and collection rates by surgery type
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
      ) : surgeryTypes && surgeryTypes.length > 0 ? (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Charges vs Payments
              </h3>
              <BarChart
                data={surgeryTypes}
                xKey="type_code"
                bars={[
                  { dataKey: 'total_charges', name: 'Charges', color: '#3b82f6' },
                  { dataKey: 'total_payments', name: 'Payments', color: '#10b981' },
                ]}
              />
            </div>

            {/* Pie Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Charges Distribution
              </h3>
              <PieChart data={pieData} />
            </div>
          </div>

          {/* Collection Rate Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Collection Rate by Surgery Type
            </h3>
            <BarChart
              data={surgeryTypes}
              xKey="type_code"
              bars={[
                { dataKey: 'collection_rate', name: 'Collection Rate (%)', color: '#8b5cf6' },
              ]}
              formatValue={(v) => `${v.toFixed(1)}%`}
            />
          </div>

          {/* Detailed Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Detailed Breakdown
            </h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Surgery Name</th>
                  <th className="text-right">Procedures</th>
                  <th className="text-right">Total Charges</th>
                  <th className="text-right">Total Payments</th>
                  <th className="text-right">Collection Rate</th>
                  <th className="text-right">Avg Days to Pay</th>
                </tr>
              </thead>
              <tbody>
                {surgeryTypes.map((type) => (
                  <tr key={type.type_code}>
                    <td className="font-medium">{type.type_code}</td>
                    <td>{type.surgery_type || '-'}</td>
                    <td className="text-right">{formatNumber(type.procedure_count)}</td>
                    <td className="text-right">{formatCurrency(type.total_charges)}</td>
                    <td className="text-right">{formatCurrency(type.total_payments)}</td>
                    <td className={`text-right font-medium ${getCollectionRateColor(type.collection_rate)}`}>
                      {formatPercent(type.collection_rate)}
                    </td>
                    <td className="text-right">
                      {type.avg_days_to_payment?.toFixed(0) || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={2}>Total</td>
                  <td className="text-right">
                    {formatNumber(surgeryTypes.reduce((sum, t) => sum + t.procedure_count, 0))}
                  </td>
                  <td className="text-right">
                    {formatCurrency(surgeryTypes.reduce((sum, t) => sum + t.total_charges, 0))}
                  </td>
                  <td className="text-right">
                    {formatCurrency(surgeryTypes.reduce((sum, t) => sum + t.total_payments, 0))}
                  </td>
                  <td className="text-right">
                    {formatPercent(
                      (surgeryTypes.reduce((sum, t) => sum + t.total_payments, 0) /
                        surgeryTypes.reduce((sum, t) => sum + t.total_charges, 0)) *
                        100 || 0
                    )}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
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
