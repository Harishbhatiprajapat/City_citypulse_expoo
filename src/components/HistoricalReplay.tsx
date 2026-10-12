import { useState, useEffect } from 'react';
import { Play, Pause, Clock, Rewind, FastForward } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrendPoint } from '@/types';

type Range = '24h' | '7d' | '30d';

interface HistoricalReplayProps {
  replayData: Record<string, TrendPoint[]>;
}

export function HistoricalReplay({ replayData }: HistoricalReplayProps) {
  const [range, setRange] = useState<Range>('24h');
  const [playing, setPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  const fullData = replayData[range] ?? replayData['24h'] ?? [];
  const visibleData = fullData.slice(0, replayIndex + 1);

  useEffect(() => {
    setReplayIndex(0);
    setPlaying(false);
  }, [replayData]);

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (replayIndex >= fullData.length - 1) {
      setReplayIndex(0);
    }
    setPlaying(true);
  }

  function stepForward() {
    setPlaying(false);
    setReplayIndex((i) => Math.min(i + 1, fullData.length - 1));
  }

  function stepBack() {
    setPlaying(false);
    setReplayIndex((i) => Math.max(i - 1, 0));
  }

  function changeRange(r: Range) {
    setRange(r);
    setReplayIndex(0);
    setPlaying(false);
  }

  useEffect(() => {
    if (!playing) return;
    if (replayIndex >= fullData.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setReplayIndex((i) => i + 1), 800);
    return () => clearTimeout(timer);
  }, [playing, replayIndex, fullData.length]);

  const ranges: { label: string; value: Range }[] = [
    { label: '24 Hours', value: '24h' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Historical Replay Mode
        </h2>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => changeRange(r.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                range === r.value
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={stepBack}
          disabled={replayIndex === 0}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-30"
          aria-label="Step back"
        >
          <Rewind className="w-5 h-5" />
        </button>
        <button
          onClick={togglePlay}
          className="w-11 h-11 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center shadow-md shadow-blue-500/30"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>
        <button
          onClick={stepForward}
          disabled={replayIndex >= fullData.length - 1}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-30"
          aria-label="Step forward"
        >
          <FastForward className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-400 dark:text-slate-500">Timeline:</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, fullData.length - 1)}
          value={replayIndex}
          onChange={(e) => {
            setPlaying(false);
            setReplayIndex(Number(e.target.value));
          }}
          className="flex-1 accent-blue-500"
        />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[60px] text-right">
          {fullData[replayIndex]?.hour ?? ''}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={visibleData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
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
          <Line type="monotone" dataKey="complaints" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} name="Complaints" />
          <Line type="monotone" dataKey="transit" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} name="Transit" />
          <Line type="monotone" dataKey="weather" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} name="Weather" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
