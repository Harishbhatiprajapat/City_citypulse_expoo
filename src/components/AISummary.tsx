import { Sparkles, Brain, Link2 } from 'lucide-react';
import type { Zone } from '@/types';

interface AISummaryProps {
  zone: Zone;
}

export function AISummary({ zone }: AISummaryProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          AI Analysis — {zone.name}
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Brain className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
              Plain-Language Summary
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{zone.aiSummary}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-2 border-t border-blue-100 dark:border-blue-900/50">
          <Link2 className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide mb-1">
              Correlation Explanation
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{zone.correlation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
