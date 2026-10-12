import { useState } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Building,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { getIncidentById, CivicIncidentItem } from '@/services/civicIncidentService';

interface IssueTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIssueId?: string;
}

const STATUS_STEPS = [
  'Reported',
  'Acknowledged',
  'Assigned',
  'In Progress',
  'Resolved',
] as const;

export function IssueTrackerModal({
  isOpen,
  onClose,
  initialIssueId = '',
}: IssueTrackerModalProps) {
  const [searchId, setSearchId] = useState(initialIssueId);
  const [searchedIncident, setSearchedIncident] = useState<CivicIncidentItem | null>(() => {
    return initialIssueId ? getIncidentById(initialIssueId) : getIncidentById('CP-2026-104921');
  });
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setErrorNotice(null);
    const found = getIncidentById(searchId);
    if (found) {
      setSearchedIncident(found);
    } else {
      setErrorNotice(`No incident ticket matching ID "${searchId.trim()}". Please verify the code or check recent reports.`);
    }
  }

  function getStepIndex(status: string) {
    const idx = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
    return idx >= 0 ? idx : 0;
  }

  const currentStep = searchedIncident ? getStepIndex(searchedIncident.status) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-citynavy-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-citynavy-accent">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-citynavy-text">
                Track Civic Issue Resolution
              </h3>
              <p className="text-xs text-slate-500 dark:text-citynavy-muted">
                Transparent municipal dispatch lifecycle & audit trail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-citynavy-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
              Enter Civic Incident Tracking ID
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="e.g. CP-2026-104921"
                  className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-citynavy-accent"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-citynavy-accent text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20"
              >
                Track Status
              </button>
            </div>

            {/* Quick Demo Chips */}
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400 flex-wrap">
              <span>Sample tickets:</span>
              {['CP-2026-104921', 'CP-2026-218490', 'CP-2026-391082'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSearchId(id);
                    setSearchedIncident(getIncidentById(id));
                    setErrorNotice(null);
                  }}
                  className="font-mono text-citynavy-accent hover:underline px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40"
                >
                  {id}
                </button>
              ))}
            </div>
          </form>

          {errorNotice && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {searchedIncident && (
            <div className="space-y-6 pt-2">
              {/* Incident Header Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-citynavy-secondary/60 border border-slate-200 dark:border-citynavy-border space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-citynavy-accent px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50">
                        {searchedIncident.id}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {searchedIncident.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-citynavy-text mt-1.5">
                      {searchedIncident.title}
                    </h4>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                      searchedIncident.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : searchedIncident.status === 'In Progress'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                    }`}
                  >
                    {searchedIncident.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {searchedIncident.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-citynavy-border/60 text-[11px] text-slate-500 dark:text-citynavy-muted">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{searchedIncident.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{searchedIncident.assignedDepartment || 'Municipal Operations'}</span>
                  </div>
                </div>
              </div>

              {/* Visual Lifecycle Stepper */}
              <div>
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">
                  Resolution Progress Workflow
                </h5>
                <div className="relative flex items-center justify-between">
                  {/* Connecting Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-slate-200 dark:bg-citynavy-border z-0" />
                  <div
                    className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-emerald-500 transition-all z-0"
                    style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                  />

                  {STATUS_STEPS.map((step, idx) => {
                    const isPassed = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <div key={step} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] transition-all ${
                            isCurrent
                              ? 'bg-citynavy-accent text-white ring-4 ring-blue-500/20'
                              : isPassed
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-200 dark:bg-citynavy-border text-slate-500'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] mt-1.5 font-semibold whitespace-nowrap hidden sm:block ${
                            isCurrent
                              ? 'text-citynavy-accent font-bold'
                              : isPassed
                              ? 'text-slate-700 dark:text-slate-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Activity Log / Audit Trail */}
              <div>
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Municipal Action Timeline
                </h5>
                <div className="space-y-2.5">
                  {searchedIncident.updates.map((upd, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-white dark:bg-citynavy-secondary/40 border border-slate-100 dark:border-citynavy-border flex items-start gap-3 text-xs"
                    >
                      <div className="w-2 h-2 rounded-full bg-citynavy-accent mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 dark:text-citynavy-text">
                            {upd.status}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(upd.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-citynavy-muted mt-0.5 leading-relaxed">
                          {upd.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
