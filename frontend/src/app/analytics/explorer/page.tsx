'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDynamicMatrix } from '@/hooks/useAnalytics';
import { formatCurrency, formatPercent } from '@/lib/utils';

type Dimension = 'surgery_type' | 'carrier' | 'billing_subcategory' | 'patient' | 'procedure_id';
type SortOrder = 'asc' | 'desc';
type DimensionFilters = Record<Dimension, Set<string>>;

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: 'surgery_type', label: 'Surgery Type' },
  { value: 'carrier', label: 'Insurance Carrier' },
  { value: 'billing_subcategory', label: 'Billing Subcategory' },
  { value: 'patient', label: 'Patient' },
  { value: 'procedure_id', label: 'Surgery ID' },
];

const dateRangeOptions = [
  { label: '3M', value: '3m', days: 90 },
  { label: '6M', value: '6m', days: 180 },
  { label: '1Y', value: '1y', days: 365 },
  { label: 'All', value: 'all', days: null },
  { label: 'Custom', value: 'custom', days: null },
];

// Helper to get the value key for a dimension
const getDimensionKey = (dimension: Dimension): string => {
  switch (dimension) {
    case 'surgery_type':
      return 'type_code';
    case 'carrier':
      return 'carrier';
    case 'billing_subcategory':
      return 'billing_subcategory';
    case 'patient':
      return 'chart_number';
    case 'procedure_id':
      return 'procedure_id';
    default:
      return 'id';
  }
};

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
    case 'procedure_id':
      return item.procedure_id as string;
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
    case 'procedure_id':
      return 'procedures';
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

// Filter Dropdown Component
function FilterDropdown({
  dimension,
  label,
  values,
  selectedValues,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  dimension: Dimension;
  label: string;
  values: { value: string; display: string }[];
  selectedValues: Set<string>;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredValues = useMemo(() => {
    if (!search) return values;
    const lower = search.toLowerCase();
    return values.filter(v => v.display.toLowerCase().includes(lower));
  }, [values, search]);

  const allSelected = selectedValues.size === values.length;
  const noneSelected = selectedValues.size === 0;
  const someSelected = !allSelected && !noneSelected;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
          noneSelected
            ? 'bg-red-50 border-red-200 text-red-700'
            : someSelected
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {label}
        {(someSelected || noneSelected) && (
          <span className={`text-white text-xs px-1.5 py-0.5 rounded-full ${noneSelected ? 'bg-red-600' : 'bg-blue-600'}`}>
            {selectedValues.size}/{values.length}
          </span>
        )}
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-20 bg-white rounded-xl shadow-lg border border-gray-200 w-72 max-h-96 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Select All / Clear All */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <button
                onClick={onSelectAll}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Select All
              </button>
              <span className="text-xs text-gray-400">
                {selectedValues.size === 0 ? values.length : selectedValues.size} of {values.length}
              </span>
              <button
                onClick={onClearAll}
                className="text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
            </div>

            {/* Options */}
            <div className="max-h-60 overflow-y-auto p-2">
              {filteredValues.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-500">
                  No results found
                </div>
              ) : (
                filteredValues.map(({ value, display }) => (
                  <label
                    key={value}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.has(value)}
                      onChange={() => onToggle(value)}
                      className="w-4 h-4 flex-shrink-0 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 truncate">{display}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AnalyticsExplorerPage() {
  const [group1, setGroup1] = useState<Dimension>('surgery_type');
  const [group2, setGroup2] = useState<Dimension | ''>('carrier');
  const [group3, setGroup3] = useState<Dimension | ''>('patient');
  const [group4, setGroup4] = useState<Dimension | ''>('');
  const [dateRange, setDateRange] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('total_charges');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter state - empty Set means "all selected"
  const [dimensionFilters, setDimensionFilters] = useState<DimensionFilters>({
    surgery_type: new Set(),
    carrier: new Set(),
    billing_subcategory: new Set(),
    patient: new Set(),
    procedure_id: new Set(),
  });

  // Handle date range preset changes
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    if (value === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (value === 'custom') {
      // Keep existing custom dates
    } else {
      const range = dateRangeOptions.find(r => r.value === value);
      if (range?.days) {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - range.days);
        setDateFrom(from.toISOString().split('T')[0]);
        setDateTo(to.toISOString().split('T')[0]);
      }
    }
  };

  // Handle custom date changes
  const handleCustomDateChange = (type: 'from' | 'to', value: string) => {
    if (type === 'from') {
      setDateFrom(value);
    } else {
      setDateTo(value);
    }
    setDateRange('custom');
  };

  const filters = useMemo(() => {
    const result: { dateFrom?: string; dateTo?: string } = {};
    if (dateFrom) result.dateFrom = dateFrom;
    if (dateTo) result.dateTo = dateTo;
    return result;
  }, [dateFrom, dateTo]);

  // Build groupBy array from selections
  const groupBy = useMemo(() => {
    const groups: string[] = [group1];
    if (group2) groups.push(group2);
    if (group3) groups.push(group3);
    if (group4) groups.push(group4);
    return groups;
  }, [group1, group2, group3, group4]);

  const { data: apiResponse, isLoading, error } = useDynamicMatrix(groupBy, filters);

  // Extract data and summary from API response
  const matrixData = apiResponse?.data || apiResponse; // Handle both old and new format
  const apiSummary = apiResponse?.summary;

  // Extract unique values for each dimension from the data
  const dimensionValues = useMemo(() => {
    const result: Record<Dimension, { value: string; display: string }[]> = {
      surgery_type: [],
      carrier: [],
      billing_subcategory: [],
      patient: [],
      procedure_id: [],
    };

    if (!matrixData) return result;

    // Helper to recursively extract values
    const extractValues = (items: Record<string, unknown>[], dimensions: string[]) => {
      if (!items || items.length === 0 || dimensions.length === 0) return;

      const currentDim = dimensions[0] as Dimension;
      const remainingDims = dimensions.slice(1);
      const key = getDimensionKey(currentDim);
      const childKey = remainingDims.length > 0 ? getChildrenKey(remainingDims[0] as Dimension) : '';

      items.forEach(item => {
        const value = String(item[key] ?? '');
        if (value) {
          const display = getDisplayValue(item, currentDim);
          if (!result[currentDim].find(v => v.value === value)) {
            result[currentDim].push({ value, display });
          }
        }

        // Recursively process children
        if (childKey && item[childKey]) {
          extractValues(item[childKey] as Record<string, unknown>[], remainingDims);
        }
      });
    };

    extractValues(matrixData as Record<string, unknown>[], groupBy);

    // Sort each dimension's values
    Object.keys(result).forEach(dim => {
      result[dim as Dimension].sort((a, b) => a.display.localeCompare(b.display));
    });

    return result;
  }, [matrixData, groupBy]);

  // Initialize filters with all values selected when data loads
  useEffect(() => {
    setDimensionFilters(prev => {
      const newFilters = { ...prev };
      let hasChanges = false;

      groupBy.forEach(dim => {
        const dimension = dim as Dimension;
        const allValues = dimensionValues[dimension];
        // Only initialize if the filter is empty and there are values
        if (prev[dimension].size === 0 && allValues.length > 0) {
          newFilters[dimension] = new Set(allValues.map(v => v.value));
          hasChanges = true;
        }
      });

      return hasChanges ? newFilters : prev;
    });
  }, [dimensionValues, groupBy]);

  // Filter the data based on selected filters
  // Now: empty set = nothing selected = show nothing; items in set = show those items
  const filteredData = useMemo(() => {
    if (!matrixData) return [];

    const filterItems = (items: Record<string, unknown>[], dimensions: string[]): Record<string, unknown>[] => {
      if (!items || items.length === 0 || dimensions.length === 0) return items;

      const currentDim = dimensions[0] as Dimension;
      const remainingDims = dimensions.slice(1);
      const key = getDimensionKey(currentDim);
      const childKey = remainingDims.length > 0 ? getChildrenKey(remainingDims[0] as Dimension) : '';
      const selectedValues = dimensionFilters[currentDim];
      const allValues = dimensionValues[currentDim];

      // Filter current level - only show items that are in the selected set
      // If selectedValues is empty, nothing passes (show nothing)
      // If selectedValues has same size as allValues, everything passes (show all)
      let filtered = items;
      if (selectedValues.size === 0) {
        // Nothing selected = show nothing
        filtered = [];
      } else if (selectedValues.size < allValues.length) {
        // Some selected = filter to only those
        filtered = items.filter(item => {
          const value = String(item[key] ?? '');
          return selectedValues.has(value);
        });
      }
      // else: all selected = show all (no filtering needed)

      // Recursively filter children
      if (childKey && filtered.length > 0) {
        filtered = filtered.map(item => {
          const children = item[childKey] as Record<string, unknown>[];
          if (children && children.length > 0) {
            const filteredChildren = filterItems(children, remainingDims);
            return { ...item, [childKey]: filteredChildren };
          }
          return item;
        }).filter(item => {
          const children = item[childKey] as Record<string, unknown>[];
          return !children || children.length > 0;
        });
      }

      return filtered;
    };

    return filterItems(matrixData as Record<string, unknown>[], groupBy);
  }, [matrixData, groupBy, dimensionFilters, dimensionValues]);

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

  // Filter handlers - simple model: set contains what's selected, empty = nothing selected
  const handleFilterToggle = useCallback((dimension: Dimension, value: string) => {
    setDimensionFilters(prev => {
      const current = prev[dimension];
      const next = new Set(current);

      if (next.has(value)) {
        next.delete(value); // Simply deselect, even if it's the last one
      } else {
        next.add(value);
      }

      return { ...prev, [dimension]: next };
    });
  }, []);

  const handleSelectAll = useCallback((dimension: Dimension) => {
    setDimensionFilters(prev => {
      const allValues = dimensionValues[dimension];
      return {
        ...prev,
        [dimension]: new Set(allValues.map(v => v.value)), // Select all values
      };
    });
  }, [dimensionValues]);

  const handleClearAll = useCallback((dimension: Dimension) => {
    setDimensionFilters(prev => ({
      ...prev,
      [dimension]: new Set(), // Empty = nothing selected
    }));
  }, []);

  // Reset all filters to "show everything" (select all values for each active dimension)
  const clearAllFilters = useCallback(() => {
    setDimensionFilters(prev => {
      const newFilters = { ...prev };
      groupBy.forEach(dim => {
        const dimension = dim as Dimension;
        const allValues = dimensionValues[dimension];
        newFilters[dimension] = new Set(allValues.map(v => v.value));
      });
      return newFilters;
    });
  }, [groupBy, dimensionValues]);

  // Check if any filters are active (i.e., not showing all values for some dimension)
  const hasActiveFilters = useMemo(() => {
    return groupBy.some(dim => {
      const dimension = dim as Dimension;
      const selectedCount = dimensionFilters[dimension].size;
      const totalCount = dimensionValues[dimension].length;
      return totalCount > 0 && selectedCount < totalCount;
    });
  }, [dimensionFilters, dimensionValues, groupBy]);

  // Sort data at root level
  const sortedData = useMemo(() => {
    if (!filteredData) return [];
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [filteredData, sortField, sortOrder]);

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
      const itemKey = `${parentKey}-${currentDim}-${item.type_code || item.carrier || item.billing_subcategory || item.chart_number || item.procedure_id}-${index}`;
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

  // Get summary stats from API (accurate totals) or calculate from filtered data
  const summaryStats = useMemo(() => {
    // Check if data has actually been filtered (compare lengths)
    const originalDataLength = Array.isArray(matrixData) ? matrixData.length : 0;
    const filteredDataLength = sortedData?.length || 0;
    const isActuallyFiltered = originalDataLength > 0 && filteredDataLength < originalDataLength;

    // If filters have actually reduced the data, calculate from filtered data
    if (isActuallyFiltered && sortedData && sortedData.length > 0) {
      const procedures = sortedData.reduce((sum, item) => sum + ((item as Record<string, number>).procedure_count || 0), 0);
      const charges = sortedData.reduce((sum, item) => sum + ((item as Record<string, number>).total_charges || 0), 0);
      const payments = sortedData.reduce((sum, item) => sum + ((item as Record<string, number>).total_payments || 0), 0);
      const rate = charges > 0 ? (payments / charges) * 100 : 0;
      return { procedures, charges, payments, rate, isFiltered: true };
    }

    // Use API summary for accurate totals (not affected by grouping)
    if (apiSummary) {
      return {
        procedures: apiSummary.total_procedures,
        charges: apiSummary.total_charges,
        payments: apiSummary.total_payments,
        rate: apiSummary.collection_rate,
        isFiltered: false,
      };
    }

    return null;
  }, [apiSummary, sortedData, matrixData]);

  return (
    <div className="p-6 space-y-4">
      {/* Header with Summary Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Explorer</h1>
        </div>
        {/* Compact Summary Stats */}
        {summaryStats && (
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Procedures:</span>
              <span className="font-semibold text-gray-900">{summaryStats.procedures.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Charges:</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(summaryStats.charges)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Payments:</span>
              <span className="font-semibold text-amber-600">{formatCurrency(summaryStats.payments)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Rate:</span>
              <span className={`font-semibold ${summaryStats.rate >= 80 ? 'text-green-600' : summaryStats.rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {formatPercent(summaryStats.rate)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Hierarchy Builder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Group by:</span>
            <div className="flex items-center gap-2">
              {/* Level 1 */}
              <select
                value={group1}
                onChange={(e) => {
                  setGroup1(e.target.value as Dimension);
                  setExpanded(new Set());
                }}
                className="appearance-none bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {DIMENSIONS.map(d => (
                  <option key={d.value} value={d.value} className="bg-white text-gray-900">{d.label}</option>
                ))}
              </select>

              <span className="text-gray-400 text-lg">→</span>

              {/* Level 2 */}
              <select
                value={group2}
                onChange={(e) => {
                  setGroup2(e.target.value as Dimension | '');
                  setGroup3('');
                  setGroup4('');
                  setExpanded(new Set());
                }}
                className={`appearance-none px-4 py-2 rounded-lg text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  group2 ? 'bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-indigo-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 focus:ring-gray-400'
                }`}
              >
                <option value="" className="bg-white text-gray-500">+ Add Level</option>
                {getAvailableDimensions(1).map(d => (
                  <option key={d.value} value={d.value} className="bg-white text-gray-900">{d.label}</option>
                ))}
              </select>

              {group2 && (
                <>
                  <span className="text-gray-400 text-lg">→</span>
                  <select
                    value={group3}
                    onChange={(e) => {
                      setGroup3(e.target.value as Dimension | '');
                      setGroup4('');
                      setExpanded(new Set());
                    }}
                    className={`appearance-none px-4 py-2 rounded-lg text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      group3 ? 'bg-violet-500 text-white hover:bg-violet-600 focus:ring-violet-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 focus:ring-gray-400'
                    }`}
                  >
                    <option value="" className="bg-white text-gray-500">+ Add Level</option>
                    {getAvailableDimensions(2).map(d => (
                      <option key={d.value} value={d.value} className="bg-white text-gray-900">{d.label}</option>
                    ))}
                  </select>
                </>
              )}

              {group3 && (
                <>
                  <span className="text-gray-400 text-lg">→</span>
                  <select
                    value={group4}
                    onChange={(e) => {
                      setGroup4(e.target.value as Dimension | '');
                      setExpanded(new Set());
                    }}
                    className={`appearance-none px-4 py-2 rounded-lg text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      group4 ? 'bg-purple-500 text-white hover:bg-purple-600 focus:ring-purple-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 focus:ring-gray-400'
                    }`}
                  >
                    <option value="" className="bg-white text-gray-500">+ Add Level</option>
                    {getAvailableDimensions(3).map(d => (
                      <option key={d.value} value={d.value} className="bg-white text-gray-900">{d.label}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Date Range Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Date Range:</span>

            {/* Quick Presets */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleDateRangeChange(option.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    dateRange === option.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-gray-200 hidden sm:block" />

            {/* Date Pickers */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleCustomDateChange('from', e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <span className="text-gray-400 mt-5">→</span>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleCustomDateChange('to', e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Clear dates button */}
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setDateRange('all');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Data Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Filters:</span>
            <div className="flex flex-wrap gap-2 flex-1">
              {groupBy.map((dim) => {
                const dimension = dim as Dimension;
                const dimConfig = DIMENSIONS.find(d => d.value === dimension);
                const values = dimensionValues[dimension];

                if (values.length === 0) return null;

                return (
                  <FilterDropdown
                    key={dimension}
                    dimension={dimension}
                    label={dimConfig?.label || dimension}
                    values={values}
                    selectedValues={dimensionFilters[dimension]}
                    onToggle={(value) => handleFilterToggle(dimension, value)}
                    onSelectAll={() => handleSelectAll(dimension)}
                    onClearAll={() => handleClearAll(dimension)}
                  />
                );
              })}
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

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
              {hasActiveFilters && ' (filtered)'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
