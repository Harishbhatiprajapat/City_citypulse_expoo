import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { TrendPoint } from '@/types';

interface TrendChartProps {
  data: TrendPoint[];
  title?: string;
  showWeather?: boolean;
  showTransit?: boolean;
  anomalyThreshold?: number;
}

export function TrendChart({
  data,
  title = '24-Hour Activity Trend',
  showWeather = true,
  showTransit = true,
  anomalyThreshold = 25,
}: TrendChartProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#f1f5f9',
            }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <ReferenceLine
            y={anomalyThreshold}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{
              value: 'Anomaly Threshold',
              position: 'right',
              fill: '#ef4444',
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="complaints"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6' }}
            activeDot={{ r: 5 }}
            name="Complaints"
          />
          {showTransit && (
            <Line
              type="monotone"
              dataKey="transit"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b' }}
              name="Transit Delay"
            />
          )}
          {showWeather && (
            <Line
              type="monotone"
              dataKey="weather"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
              name="Weather Events"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
