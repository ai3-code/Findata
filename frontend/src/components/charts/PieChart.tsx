'use client';

import { useState } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { CHART_COLORS, formatCurrency } from '@/lib/utils';

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  height?: number;
  formatValue?: (value: number) => string;
  innerRadius?: number;
  outerRadius?: number;
}

// Custom active shape for hover effect
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

export default function PieChart({
  data,
  height = 300,
  formatValue = formatCurrency,
  innerRadius = 60,
  outerRadius = 100,
}: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col" style={{ height }}>
      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  style={{ outline: 'none', cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatValue(value)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div className="mt-3 max-h-24 overflow-y-auto">
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
          {data.map((entry, index) => {
            const percent = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
            const isActive = activeIndex === index;
            return (
              <div
                key={entry.name}
                className={`flex items-center gap-1.5 text-xs cursor-pointer transition-all ${
                  isActive ? 'opacity-100 scale-105' : activeIndex !== undefined ? 'opacity-50' : 'opacity-100'
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="text-gray-600 truncate max-w-[100px]" title={entry.name}>
                  {entry.name}
                </span>
                <span className="text-gray-400">({percent}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
