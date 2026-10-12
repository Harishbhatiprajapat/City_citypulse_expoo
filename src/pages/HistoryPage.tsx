import { useEffect, useState } from 'react';
import { History, Trash2, Search, MapPin, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/types';

interface SearchRecord {
  id: string;
  query: string;
  results_count: number;
  created_at: string;
}

interface HistoryPageProps {
  onNavigate: (page: Page) => void;
}

export function HistoryPage({ onNavigate }: HistoryPageProps) {
  const { user } = useAuth();
  const [records, setRecords] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('search_history')
        .select('id, query, results_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setRecords(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  async function handleDelete(id: string) {
    setRecords((r) => r.filter((rec) => rec.id !== id));
    await supabase.from('search_history').delete().eq('id', id);
  }

  async function handleClearAll() {
    if (!user) return;
    setRecords([]);
    await supabase.from('search_history').delete().eq('user_id', user.id);
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <History className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 mb-4">Sign in to view your search history.</p>
          <button
            onClick={() => onNavigate('login')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Search History</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your past city searches</p>
            </div>
          </div>
          {records.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
            <Search className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">No searches yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
              Use the search bar on the dashboard to look up cities. Your searches will appear here.
            </p>
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{rec.query}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(rec.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    {rec.results_count > 0 && (
                      <span>{rec.results_count} zones found</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(rec.id)}
                  className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 transition-all"
                  aria-label="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
