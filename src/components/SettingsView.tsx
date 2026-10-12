import { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  Shield,
  Save,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Compass,
} from 'lucide-react';
import type { UserSettings } from '@/types';

interface SettingsViewProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
}

export function SettingsView({ settings, onSaveSettings }: SettingsViewProps) {
  const [form, setForm] = useState<UserSettings>(settings);
  const [showTomtomKey, setShowTomtomKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSaveSettings(form);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-citynavy-accent">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-citynavy-text">
              Platform & Telemetry Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-0.5">
              Configure telemetry providers, API credentials, display units, and GIS cartography
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* API Credentials Card */}
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-citynavy-border">
            <h3 className="text-sm font-bold text-slate-900 dark:text-citynavy-text flex items-center gap-2">
              <Key className="w-4 h-4 text-citynavy-accent" />
              API Provider Credentials
            </h3>
            <span className="text-[11px] text-slate-400">Stored client-side in localStorage</span>
          </div>

          {/* TomTom API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                TomTom Traffic API Key (Optional)
              </label>
              <a
                href="https://developer.tomtom.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-citynavy-accent hover:underline flex items-center gap-1"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showTomtomKey ? 'text' : 'password'}
                value={form.tomtomApiKey || ''}
                onChange={(e) => setForm({ ...form, tomtomApiKey: e.target.value })}
                placeholder="Enter TomTom API key for live flow tiles & probe incidents..."
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-citynavy-accent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowTomtomKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showTomtomKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-citynavy-muted leading-relaxed">
              Enables real-time road probe raster tiles and incident telemetry. If left blank, the platform cleanly displays corridor status without fabricating mock congestion.
            </p>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Google Gemini API Key (Optional)
              </label>
              <a
                href="https://aistudio.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-citynavy-accent hover:underline flex items-center gap-1"
              >
                <span>Get Free AI Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={form.geminiApiKey || ''}
                onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
                placeholder="Enter Google Gemini API key for advanced natural language reasoning..."
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-citynavy-accent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-citynavy-muted leading-relaxed">
              Powers conversational reasoning with full application tool calling. If omitted, the AI Assistant executes queries with the built-in deterministic tool engine.
            </p>
          </div>
        </div>

        {/* Display Preferences Card */}
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-citynavy-border">
            <h3 className="text-sm font-bold text-slate-900 dark:text-citynavy-text flex items-center gap-2">
              <Compass className="w-4 h-4 text-citynavy-accent" />
              Measurement & GIS Preferences
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block mb-1.5">
                Temperature Unit
              </label>
              <select
                value={form.tempUnit}
                onChange={(e) => setForm({ ...form, tempUnit: e.target.value as 'C' | 'F' })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-citynavy-accent"
              >
                <option value="C">Celsius (°C)</option>
                <option value="F">Fahrenheit (°F)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block mb-1.5">
                Distance Unit
              </label>
              <select
                value={form.distanceUnit}
                onChange={(e) => setForm({ ...form, distanceUnit: e.target.value as 'km' | 'mi' })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-citynavy-accent"
              >
                <option value="km">Kilometers (km)</option>
                <option value="mi">Miles (mi)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status of Core Zero-Key Services */}
        <div className="bg-slate-50 dark:bg-citynavy-secondary/40 border border-slate-200 dark:border-citynavy-border rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Shield className="w-4 h-4 text-emerald-500" />
            Core Zero-Key Open Services (Always Active)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500 dark:text-citynavy-muted pt-1">
            <div>✓ Open-Meteo High-Resolution Weather (Direct)</div>
            <div>✓ Open-Meteo CAMS Air Quality Telemetry</div>
            <div>✓ OpenStreetMap Nominatim Facility Geocoding</div>
            <div>✓ OSRM Road Topology & Routing Machine</div>
            <div>✓ US NWS Official Emergency Bulletins</div>
            <div>✓ CartoDB Dark Matter GIS Cartography</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-citynavy-accent text-white font-semibold text-xs hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
          {savedNotice && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Preferences saved!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
