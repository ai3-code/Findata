'use client';

import { useState, useMemo } from 'react';
import { useDynamicMatrix } from '@/hooks/useAnalytics';
import { formatCurrency, formatPercent } from '@/lib/utils';

type Dimension = 'surgery_type' | 'carrier' | 'billing_subcategory' | 'patient';
type SortOrder = 'asc' | 'desc';

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: 'surgery_type', label: 'Surgery Type' },
  { value: 'carrier', label: 'Insurance Carrier' },
  { value: 'billing_subcategory', label: 'Billing Subcategory' },
  { value: 'patient', label: 'Patient' },
];

const dateRangeOptions = [
  { label: '3M', value: '3m', days: 90 },
  { label: '6M', value: '6m', days: 180 },
  { label: '9M', value: '9m', days: 270 },
  { label: '1Y', value: '1y', days: 365 },
  { label: 'All', value: 'all', days: null },
];

// Helper to get display value for a dimension
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

// Helper to get the children key for a dimension
const getChildrenKey = (dimension: Dimension): string => {
  switch (dimension) {
    case 'surgery_type':
      return 'surgery_types';
    case 'carrier':
      return 'carriers';
    case 'billing_subcategory':
      return 'billing_subcategories';
    case 'patient':
      return 'patients';
    default:
      return 'children';
  }
};

// Row colors for different levels
const levelColors = [
  { bg: 'bg-white', hoverBg: 'hover:bg-gray-50', text: 'text-gray-900', icon: 'text-gray-400' },
  { bg: 'bg-blue-50', hoverBg: 'hover:bg-blue-100', text: 'text-blue-800', icon: 'text-blue-400' },
  { bg: 'bg-green-50', hoverBg: 'hover:bg-green-100', text: 'text-green-800', icon: 'text-green-400' },
  { bg: 'bg-purple-50', hoverBg: 'hover:bg-purple-100', text: 'text-purple-800', icon: 'text-purple-400' },
];

export default function AnalyticsExplorerPage() {
  const [group1, setGroup1] = useState<Dimension>('surgery_type');
  const [group2, setGroup2] = useState<Dimension | ''>('carrier');
  const [group3, setGroup3] = useState<Dimension | ''>('patient');
  const [group4, setGroup4] = useState<Dimension | ''>('');
  const [dateRange, setDateRange] = useState('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('total_charges');
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

  // Build groupBy array from selections
  const groupBy = useMemo(() => {
    const groups: string[] = [group1];
    if (group2) groups.push(group2);
    if (group3) groups.push(group3);
    if (group4) groups.push(group4);
    return groups;
  }, [group1, group2, group3, group4]);

  const { data: matrixData, isLoading, error } = useDynamicMatrix(groupBy, filters);

  // Get available dimensions for each selector (excluding already selected)
  const getAvailableDimensions = (currentIndex: number) => {
    const selected = [group1, group2, group3, group4].filter((g, i) => g && i < currentIndex);
    return DIMENSIONS.filter(d => !selected.includes(d.value));
  };

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Sort data at root level
  const sortedData = useMemo(() => {
    if (!matrixData) return [];
    const sorted = [...matrixData];
    sorted.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [matrixData, sortField, sortOrder]);

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
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

  // Recursive row renderer
  const renderRows = (
    items: Record<string, unknown>[],
    dimensions: string[],
    level: number = 0,
    parentKey: string = ''
  ): React.ReactNode[] => {
    if (!items || items.length === 0) return [];

    const currentDim = dimensions[0] as Dimension;
    const remainingDims = dimensions.slice(1);
    const colors = levelColors[level] || levelColors[levelColors.length - 1];
    const hasChildren = remainingDims.length > 0;
    const childrenKey = hasChildren ? getChildrenKey(remainingDims[0] as Dimension) : '';

    return items.flatMap((item, index) => {
      const itemKey = `${parentKey}-${currentDim}-${item.type_code || item.carrier || item.billing_subcategory || item.chart_number}-${index}`;
      const isExpanded = expanded.has(itemKey);
      const children = hasChildren ? (item[childrenKey] as Record<string, unknown>[]) : [];
      const indent = level * 24;

      const rows: React.ReactNode[] = [
        <tr
          key={itemKey}
          className={`${colors.bg} ${hasChildren && children?.length > 0 ? `cursor-pointer ${colors.hoverBg}` : ''}`}
          onClick={() => hasChildren && children?.length > 0 && toggleExpand(itemKey)}
        >
          <td className="px-2 py-3 text-center" style={{ paddingLeft: `${8 + indent}px` }}>
            {hasChildren && children?.length > 0 && (
              <span className={colors.icon}>
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
          </td>
          <td className={`px-4 py-3 whitespace-nowrap ${colors.text}`}>
            <span className={level === 0 ? 'font-medium' : 'text-sm'}>
              {getDisplayValue(item, currentDim)}
            </span>
          </td>
          <td className={`px-4 py-3 whitespace-nowrap text-sm ${colors.text}`}>
            {item.procedure_count as number}
          </td>
          <td className={`px-4 py-3 whitespace-nowrap text-sm ${colors.text}`}>
            {formatCurrency(item.total_charges as number)}
          </td>
          <td className={`px-4 py-3 whitespace-nowrap text-sm ${colors.text}`}>
            {formatCurrency(item.total_payments as number)}
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <span className={`text-sm font-medium ${
              (item.collection_rate as number) >= 80 ? 'text-green-600' :
              (item.collection_rate as number) >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {formatPercent(item.collection_rate as number)}
            </span>
          </td>
          <td className={`px-4 py-3 whitespace-nowrap text-sm ${colors.text}`}>
            {item.avg_days_to_payment != null ? `${item.avg_days_to_payment} days` : '-'}
          </td>
        </tr>
      ];

      if (isExpanded && children?.length > 0) {
        rows.push(...renderRows(children, remainingDims, level + 1, itemKey));
      }

      return rows;
    });
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Failed to load analytics data
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Explorer</h1>
        <p className="text-gray-500 mt-1">
          Customize your view by selecting grouping dimensions
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Hierarchy Builder */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Data Hierarchy</h3>
            <span className="text-xs text-gray-400">{groupBy.length} level{groupBy.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Visual Hierarchy Chain */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Level 1 - Primary Group */}
            <div className="flex items-center">
              <div className="relative">
                <select
                  value={group1}
                  onChange={(e) => {
                    setGroup1(e.target.value as Dimension);
                    setExpanded(new Set());
                  }}
                  className="appearance-none bg-blue-600 text-white pl-4 pr-8 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {DIMENSIONS.map(d => (
                    <option key={d.value} value={d.value} className="bg-white text-gray-900">{d.label}</option>
                  ))}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Arrow 1 */}
            <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* Level 2 */}
            <div className="relative">
              <select
                value={group2}
                onChange={(e) => {
                  setGroup2(e.target.value as Dimension | '');
                  setGroup3('');
                  setGroup4('');
                  setExpanded(new Set());
                }}
                className={`appearance-none pl-4 pr-8 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  group2
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-indigo-500'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 focus:ring-gray-400'
                }`}
              >
                <option value="" className="bg-white text-gray-500">+ Add level</option>
                {getAvailableDimensions(1).map(d => (
                  <option key={d.value} value={d.value} className="bg-white text-gray-900">{d.label}</option>
                ))}
              </select>
              <svg className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${group2 ? 'text-indigo-200' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Arrow 2 */}
            {group2 && (
              <>
                <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>

                {/* Level 3 */}
                <div className="relative">
                  <select
                    value={group3}
                    onChange={(e) => {
                      setGroup3(e.target.value as Dimension | '');
                      setGroup4('');
                      setExpanded(new Set());
                    }}
                    className={`appearance-none pl-4 pr-8 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      group3
                        ? 'bg-violet-500 text-white hover:bg-violet-600 focus:ring-violet-500'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 focus:ring-gray-400'
                    }`}
                  >
                    <option value="" className="bg-white text-gray-500">+ Add level</option>
                    {getAvailableDimensions(2).map(d => (
                      <option key={d.value} value={d.value} className="bg-white text-gray-900">{d.label}</option>
                    ))}
                  </select>
                  <svg className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${group3 ? 'text-violet-200' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </>
            )}

            {/* Arrow 3 */}
            {group3 && (
              <>
                <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>

                {/* Level 4 */}
                <div className="relative">
                  <select
                    value={group4}
                    onChange={(e) => {
                      setGroup4(e.target.value as Dimension | '');
                      setExpanded(new Set());
                    }}
                    className={`appearance-none pl-4 pr-8 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      group4
                        ? 'bg-purple-500 text-white hover:bg-purple-600 focus:ring-purple-500'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 focus:ring-gray-400'
                    }`}
                  >
                    <option value="" className="bg-white text-gray-500">+ Add level</option>
                    {getAvailableDimensions(3).map(d => (
                      <option key={d.value} value={d.value} className="bg-white text-gray-900">{d.label}</option>
                    ))}
                  </select>
                  <svg className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${group4 ? 'text-purple-200' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Time Period */}
        <div className="px-5 py-4 bg-gray-50/50 rounded-b-xl flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Time Period</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {dateRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  dateRange === option.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats - at the top */}
      {sortedData && sortedData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Procedures</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sortedData.reduce((sum, item) => sum + ((item as Record<string, number>).procedure_count || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Total Charges</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(sortedData.reduce((sum, item) => sum + ((item as Record<string, number>).total_charges || 0), 0))}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(sortedData.reduce((sum, item) => sum + ((item as Record<string, number>).total_payments || 0), 0))}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl border border-violet-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-violet-600 uppercase tracking-wide">Collection Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercent(
                    (sortedData.reduce((sum, item) => sum + ((item as Record<string, number>).total_payments || 0), 0) /
                      sortedData.reduce((sum, item) => sum + ((item as Record<string, number>).total_charges || 0), 0)) * 100 || 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-500">Loading data...</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="w-10"></th>
                  <SortHeader field="name">
                    {DIMENSIONS.find(d => d.value === group1)?.label || 'Name'}
                  </SortHeader>
                  <SortHeader field="procedure_count">Procedures</SortHeader>
                  <SortHeader field="total_charges">Total Charges</SortHeader>
                  <SortHeader field="total_payments">Total Payments</SortHeader>
                  <SortHeader field="collection_rate">Collection Rate</SortHeader>
                  <SortHeader field="avg_days_to_payment">Avg Days to Pay</SortHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedData && sortedData.length > 0 ? (
                  renderRows(sortedData as Record<string, unknown>[], groupBy, 0, '')
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-gray-500">No data available</span>
                        <span className="text-sm text-gray-400">Try adjusting your filters</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {sortedData && sortedData.length > 0 && (
            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-500">
              Showing {sortedData.length} {DIMENSIONS.find(d => d.value === group1)?.label.toLowerCase() || 'item'}{sortedData.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
