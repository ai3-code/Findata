'use client';

import { useDashboard, useSurgeryTypeMetrics, useTrends, useFilterOptions } from '@/hooks/useAnalytics';
import { useFilters } from '@/hooks/useFilters';
import FilterPanel from '@/components/filters/FilterPanel';
import MetricCard from '@/components/ui/MetricCard';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';

export default function DashboardPage() {
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
  const { data: metrics, isLoading: metricsLoading } = useDashboard(filters);
  const { data: surgeryTypes, isLoading: surgeryTypesLoading } = useSurgeryTypeMetrics(filters);
  const { data: trends, isLoading: trendsLoading } = useTrends(filters, 'month');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of surgery billing and payments</p>
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Charges"
          value={metricsLoading ? '...' : formatCurrency(metrics?.total_charges || 0)}
          subtitle={`${formatNumber(metrics?.procedure_count || 0)} procedures`}
        />
        <MetricCard
          title="Total Payments"
          value={metricsLoading ? '...' : formatCurrency(metrics?.total_payments || 0)}
          subtitle={`${formatNumber(metrics?.patient_count || 0)} patients`}
        />
        <MetricCard
          title="Collection Rate"
          value={metricsLoading ? '...' : formatPercent(metrics?.collection_rate || 0)}
          subtitle="of charges collected"
        />
        <MetricCard
          title="Avg Days to Payment"
          value={metricsLoading ? '...' : metrics?.avg_days_to_payment?.toFixed(0) || 'N/A'}
          subtitle="from date of service"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
          {trendsLoading ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Loading...
            </div>
          ) : trends && trends.length > 0 ? (
            <LineChart
              data={trends}
              xKey="period"
              lines={[
                { dataKey: 'charges', name: 'Charges', color: '#3b82f6' },
                { dataKey: 'payments', name: 'Payments', color: '#10b981' },
              ]}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available. Upload data to see trends.
            </div>
          )}
        </div>

        {/* Surgery Type Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Surgery Type</h3>
          {surgeryTypesLoading ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Loading...
            </div>
          ) : surgeryTypes && surgeryTypes.length > 0 ? (
            <BarChart
              data={surgeryTypes}
              xKey="type_code"
              bars={[
                { dataKey: 'total_charges', name: 'Charges', color: '#3b82f6' },
                { dataKey: 'total_payments', name: 'Payments', color: '#10b981' },
              ]}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No data available. Upload data to see breakdown.
            </div>
          )}
        </div>
      </div>

      {/* Surgery Types Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Surgery Type Breakdown</h3>
        {surgeryTypesLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : surgeryTypes && surgeryTypes.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th className="text-right">Procedures</th>
                <th className="text-right">Charges</th>
                <th className="text-right">Payments</th>
                <th className="text-right">Collection Rate</th>
                <th className="text-right">Avg Days</th>
              </tr>
            </thead>
            <tbody>
              {surgeryTypes.map((type) => (
                <tr key={type.type_code}>
                  <td className="font-medium">{type.type_code}</td>
                  <td className="text-right">{formatNumber(type.procedure_count)}</td>
                  <td className="text-right">{formatCurrency(type.total_charges)}</td>
                  <td className="text-right">{formatCurrency(type.total_payments)}</td>
                  <td className="text-right">{formatPercent(type.collection_rate)}</td>
                  <td className="text-right">
                    {type.avg_days_to_payment?.toFixed(0) || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No data available. Upload data to see breakdown.</p>
        )}
      </div>
    </div>
  );
}
