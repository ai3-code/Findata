'use client';

import { useState, useMemo } from 'react';
import { useDynamicMatrix, useTrends, useDaysToPayment } from '@/hooks/useAnalytics';
import PieChart from '@/components/charts/PieChart';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';

type Dimension = 'surgery_type' | 'carrier' | 'billing_subcategory' | 'patient';
type DateRange = '3m' | '6m' | '1y' | 'all';

const DIMENSIONS: { value: Dimension; label: string; icon: string }[] = [
  { value: 'surgery_type', label: 'Surgery Type', icon: '🏥' },
  { value: 'carrier', label: 'Insurance Carrier', icon: '🏢' },
  { value: 'billing_subcategory', label: 'Billing Category', icon: '📋' },
];

const DATE_RANGES: { value: DateRange; label: string; days: number | null }[] = [
  { value: '3m', label: '3 Months', days: 90 },
  { value: '6m', label: '6 Months', days: 180 },
  { value: '1y', label: '1 Year', days: 365 },
  { value: 'all', label: 'All Time', days: null },
];

const getDimensionKey = (dimension: Dimension): string => {
  switch (dimension) {
    case 'surgery_type': return 'type_code';
    case 'carrier': return 'carrier';
    case 'billing_subcategory': return 'billing_subcategory';
    case 'patient': return 'chart_number';
    default: return 'id';
  }
};

const getDisplayValue = (item: Record<string, unknown>, dimension: Dimension): string => {
  switch (dimension) {
    case 'surgery_type':
      return `${item.type_code}${item.type_name ? ` - ${item.type_name}` : ''}`;
    case 'carrier':
      return item.carrier as string;
    case 'billing_subcategory':
      return item.billing_subcategory as string || 'Unknown';
    case 'patient':
      return `Patient #${item.chart_number}`;
    default:
      return 'Unknown';
  }
};

// Sparkline component for mini charts in cards
function Sparkline({ data, color = '#3b82f6', height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="3"
        fill={color}
      />
    </svg>
  );
}

// Progress bar component
function ProgressBar({ value, max, color = 'blue', showLabel = true }: { value: number; max: number; color?: string; showLabel?: boolean }) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="w-full">
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color] || colorClasses.blue} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-gray-500">{percent.toFixed(1)}%</div>
      )}
    </div>
  );
}

// Enhanced Metric Card
function EnhancedMetricCard({
  title,
  value,
  subtitle,
  icon,
  sparklineData,
  color = 'blue',
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  sparklineData?: number[];
  color?: string;
}) {
  const gradients: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
  };

  const sparkColors: Record<string, string> = {
    blue: '#3b82f6',
    green: '#10b981',
    amber: '#f59e0b',
    purple: '#8b5cf6',
  };

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
          </div>
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[color]} flex items-center justify-center text-white text-xl`}>
            {icon}
          </div>
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <div className="mt-4">
            <Sparkline data={sparklineData} color={sparkColors[color] || sparkColors.blue} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [primaryDimension, setPrimaryDimension] = useState<Dimension>('surgery_type');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('total_charges');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Calculate date filters
  const filters = useMemo(() => {
    const range = DATE_RANGES.find(r => r.value === dateRange);
    if (!range?.days) return {};

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - range.days);
    return {
      dateFrom: from.toISOString().split('T')[0],
      dateTo: to.toISOString().split('T')[0],
    };
  }, [dateRange]);

  // Fetch data
  const { data: apiResponse, isLoading } = useDynamicMatrix([primaryDimension], filters);
  const { data: trends } = useTrends(filters, 'month');
  const { data: daysToPayment } = useDaysToPayment(filters);

  // Extract data and summary
  const matrixData = useMemo(() => {
    if (!apiResponse) return [];
    return apiResponse?.data || apiResponse || [];
  }, [apiResponse]);

  const summary = apiResponse?.summary;

  // Sort data
  const sortedData = useMemo(() => {
    if (!matrixData || !Array.isArray(matrixData)) return [];
    const sorted = [...matrixData];
    sorted.sort((a, b) => {
      const aVal = (a as Record<string, number>)[sortField] ?? 0;
      const bVal = (b as Record<string, number>)[sortField] ?? 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [matrixData, sortField, sortOrder]);

  // Top items for charts
  const topItems = useMemo(() => sortedData.slice(0, 8), [sortedData]);

  // Prepare pie chart data
  const pieChartData = useMemo(() => {
    return topItems.map(item => ({
      name: getDisplayValue(item as Record<string, unknown>, primaryDimension).substring(0, 20),
      value: (item as Record<string, number>).total_charges || 0,
    }));
  }, [topItems, primaryDimension]);

  // Prepare sparkline data from trends
  const chargesSparkline = useMemo(() => {
    if (!trends) return [];
    return trends.slice(-12).map((t: { charges: number }) => t.charges);
  }, [trends]);

  const paymentsSparkline = useMemo(() => {
    if (!trends) return [];
    return trends.slice(-12).map((t: { payments: number }) => t.payments);
  }, [trends]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-blue-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  const maxCharges = useMemo(() => {
    if (!sortedData.length) return 0;
    return Math.max(...sortedData.map((d) => (d as Record<string, number>).total_charges || 0));
  }, [sortedData]);

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Surgery billing analytics overview</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Pills */}
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            {DATE_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateRange === range.value
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Dimension Selector */}
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            {DIMENSIONS.map((dim) => (
              <button
                key={dim.value}
                onClick={() => {
                  setPrimaryDimension(dim.value);
                  setSelectedItem(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  primaryDimension === dim.value
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{dim.icon}</span>
                <span className="hidden sm:inline">{dim.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <EnhancedMetricCard
          title="Total Procedures"
          value={isLoading ? '...' : formatNumber(summary?.total_procedures || 0)}
          subtitle={`Across all ${DIMENSIONS.find(d => d.value === primaryDimension)?.label.toLowerCase()}s`}
          icon="📊"
          color="blue"
        />
        <EnhancedMetricCard
          title="Total Charges"
          value={isLoading ? '...' : formatCurrency(summary?.total_charges || 0)}
          subtitle="Billed amount"
          icon="💰"
          sparklineData={chargesSparkline}
          color="green"
        />
        <EnhancedMetricCard
          title="Total Payments"
          value={isLoading ? '...' : formatCurrency(summary?.total_payments || 0)}
          subtitle="Collected amount"
          icon="💵"
          sparklineData={paymentsSparkline}
          color="amber"
        />
        <EnhancedMetricCard
          title="Collection Rate"
          value={isLoading ? '...' : formatPercent(summary?.collection_rate || 0)}
          subtitle={daysToPayment?.avg_days ? `Avg ${daysToPayment.avg_days.toFixed(0)} days to pay` : 'Payment efficiency'}
          icon="📈"
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-500">Charges</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-gray-500">Payments</span>
              </div>
            </div>
          </div>
          {trends && trends.length > 0 ? (
            <LineChart
              data={trends}
              xKey="period"
              lines={[
                { dataKey: 'charges', name: 'Charges', color: '#3b82f6' },
                { dataKey: 'payments', name: 'Payments', color: '#10b981' },
              ]}
              height={280}
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">📈</div>
                <p>No trend data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Distribution Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            By {DIMENSIONS.find(d => d.value === primaryDimension)?.label}
          </h3>
          {pieChartData.length > 0 ? (
            <PieChart
              data={pieChartData}
              height={280}
              innerRadius={50}
              outerRadius={90}
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">🥧</div>
                <p>No distribution data</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top {DIMENSIONS.find(d => d.value === primaryDimension)?.label}s by Revenue
        </h3>
        {topItems.length > 0 ? (
          <BarChart
            data={topItems.map(item => ({
              ...item,
              name: getDisplayValue(item as Record<string, unknown>, primaryDimension).substring(0, 15),
            }))}
            xKey="name"
            bars={[
              { dataKey: 'total_charges', name: 'Charges', color: '#3b82f6' },
              { dataKey: 'total_payments', name: 'Payments', color: '#10b981' },
            ]}
            height={250}
          />
        ) : (
          <div className="h-[250px] flex items-center justify-center text-gray-400">
            No data available
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {DIMENSIONS.find(d => d.value === primaryDimension)?.label} Breakdown
            </h3>
            <span className="text-sm text-gray-500">
              {sortedData.length} {sortedData.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
            Loading data...
          </div>
        ) : sortedData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <SortHeader field="name">
                    {DIMENSIONS.find(d => d.value === primaryDimension)?.label}
                  </SortHeader>
                  <SortHeader field="procedure_count">Procedures</SortHeader>
                  <SortHeader field="total_charges">Charges</SortHeader>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Distribution
                  </th>
                  <SortHeader field="total_payments">Payments</SortHeader>
                  <SortHeader field="collection_rate">Rate</SortHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedData.map((item, index) => {
                  const itemData = item as Record<string, unknown>;
                  const key = getDimensionKey(primaryDimension);
                  const itemKey = String(itemData[key] || index);
                  const isSelected = selectedItem === itemKey;

                  return (
                    <tr
                      key={itemKey}
                      onClick={() => setSelectedItem(isSelected ? null : itemKey)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{DIMENSIONS.find(d => d.value === primaryDimension)?.icon}</span>
                          <span className="font-medium text-gray-900">
                            {getDisplayValue(itemData, primaryDimension)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {formatNumber((itemData as Record<string, number>).procedure_count || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency((itemData as Record<string, number>).total_charges || 0)}
                      </td>
                      <td className="px-4 py-3 w-32">
                        <ProgressBar
                          value={(itemData as Record<string, number>).total_charges || 0}
                          max={maxCharges}
                          color="blue"
                          showLabel={false}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatCurrency((itemData as Record<string, number>).total_payments || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ((itemData as Record<string, number>).collection_rate || 0) >= 50
                            ? 'bg-emerald-50 text-emerald-700'
                            : ((itemData as Record<string, number>).collection_rate || 0) >= 25
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {formatPercent((itemData as Record<string, number>).collection_rate || 0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-medium">No data available</p>
            <p className="text-sm mt-1">Upload billing data to see analytics</p>
          </div>
        )}
      </div>

      {/* Days to Payment Distribution */}
      {daysToPayment?.distribution && daysToPayment.distribution.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Days to Payment Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {daysToPayment.distribution.map((bucket: { range: string; count: number; percent: number }) => (
              <div key={bucket.range} className="text-center p-3 rounded-xl bg-gray-50">
                <div className="text-2xl font-bold text-gray-900">{bucket.count}</div>
                <div className="text-xs text-gray-500 mt-1">{bucket.range}</div>
                <div className="text-xs font-medium text-blue-600 mt-1">{bucket.percent}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
