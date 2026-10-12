import { useState } from 'react';
import {
  X,
  AlertTriangle,
  Upload,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Send,
} from 'lucide-react';
import {
  reportCivicIssue,
  IncidentCategory,
  CivicIncidentItem,
} from '@/services/civicIncidentService';
import type { CityInfo } from '@/types';

interface CivicReportingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: CityInfo;
  onTrackIssue?: (issueId: string) => void;
}

const CATEGORIES: { id: IncidentCategory; label: string; icon: string }[] = [
  { id: 'Potholes', label: 'Pothole & Surface Damage', icon: '🕳️' },
  { id: 'Roads', label: 'Road Repair / Obstruction', icon: '🚧' },
  { id: 'Traffic signals', label: 'Traffic Signal Failure', icon: '🚦' },
  { id: 'Garbage', label: 'Garbage Overflow / Sanitation', icon: '🗑️' },
  { id: 'Drainage', label: 'Drainage & Waterlogging', icon: '🌊' },
  { id: 'Streetlights', label: 'Broken Streetlight', icon: '💡' },
  { id: 'Water', label: 'Water Pipeline Leak', icon: '💧' },
  { id: 'Public safety', label: 'Public Safety Concern', icon: '🛡️' },
  { id: 'Pollution', label: 'Dust / Industrial Pollution', icon: '🌫️' },
  { id: 'Parks', label: 'Park Maintenance', icon: '🌳' },
  { id: 'Public transport', label: 'Bus Stop / Transit Issue', icon: '🚌' },
  { id: 'Noise', label: 'Excessive Noise Nuisance', icon: '📢' },
  { id: 'Other', label: 'Other Civic Infrastructure', icon: '📋' },
];

export function CivicReportingModal({
  isOpen,
  onClose,
  currentCity,
  onTrackIssue,
}: CivicReportingModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory>('Potholes');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState(`${currentCity.name}`);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submittedIncident, setSubmittedIncident] = useState<CivicIncidentItem | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    const incident = reportCivicIssue({
      title: title.trim() || `${selectedCategory} reported near ${locationName}`,
      category: selectedCategory,
      description: description.trim(),
      location: locationName.trim(),
      city: currentCity.name,
      coordinates: { lat: currentCity.latitude, lng: currentCity.longitude },
      photoUrl: photoPreview || undefined,
      severity: 'Medium',
    });

    setSubmittedIncident(incident);
  }

  function handleCopyId() {
    if (submittedIncident) {
      navigator.clipboard.writeText(submittedIncident.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleReset() {
    setSubmittedIncident(null);
    setTitle('');
    setDescription('');
    setPhotoPreview(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-citynavy-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-citynavy-text">
                Report a Civic Issue
              </h3>
              <p className="text-xs text-slate-500 dark:text-citynavy-muted">
                Direct municipal incident dispatch for {currentCity.label}
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-citynavy-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {submittedIncident ? (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-citynavy-text">
                  Your Report Has Been Submitted
                </h4>
                <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-1 max-w-md mx-auto">
                  Municipal operations ticket generated and routed to the {submittedIncident.assignedDepartment}.
                </p>
              </div>

              {/* Unique Ticket ID Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border max-w-sm mx-auto flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tracking Issue ID
                  </span>
                  <span className="text-base font-mono font-black text-citynavy-accent">
                    {submittedIncident.id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {onTrackIssue && (
                  <button
                    type="button"
                    onClick={() => {
                      onTrackIssue(submittedIncident.id);
                      handleReset();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-citynavy-accent text-white text-xs font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25"
                  >
                    <span>Track Status Live</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-citynavy-secondary text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-2">
                  1. Select Incident Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'border-citynavy-accent bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                            : 'border-slate-200 dark:border-citynavy-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-citynavy-secondary'
                        }`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    2. Headline or Brief Summary
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Deep pothole causing two-wheeler skid near crossroads"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-citynavy-accent"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    3. Detailed Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe specific hazard, landmarks, lane direction, and urgency..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-citynavy-accent resize-none"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    4. Specific Street / Landmark
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Street name, landmark, or area..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-citynavy-accent"
                    />
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    5. Attach Photo (Optional)
                  </label>
                  {photoPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-citynavy-border h-32 w-full">
                      <img src={photoPreview} alt="Incident preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 dark:border-citynavy-border rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-citynavy-secondary/50 transition-colors">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Click to upload photo or screenshot
                      </span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 5MB</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-citynavy-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-citynavy-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-citynavy-accent text-white text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Incident Report</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
