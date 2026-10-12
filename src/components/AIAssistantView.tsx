import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  Wrench,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Compass,
  Navigation,
} from 'lucide-react';
import { executeCityAssistantQuery, AssistantResponse } from '@/services/aiAssistantService';
import type { CityInfo, Page } from '@/types';

interface AIAssistantViewProps {
  currentCity: CityInfo;
  geminiApiKey?: string;
  onNavigateToTab?: (tab: Page) => void;
  onPlanRouteTo?: (destName: string, lat: number, lng: number) => void;
}

export function AIAssistantView({
  currentCity,
  geminiApiKey,
  onNavigateToTab,
  onPlanRouteTo,
}: AIAssistantViewProps) {
  const [messages, setMessages] = useState<AssistantResponse[]>([
    {
      id: 'welcome_1',
      role: 'assistant',
      content: `👋 Hello! I am your **CityPulse Smart City Intelligence Assistant** for **${currentCity.name}**.\n\nI am connected directly to real municipal telematics: Open-Meteo atmospheric sensors, Copernicus air quality telemetry, OpenStreetMap GIS records, and OSRM road machines.\n\nAsk me about nearby hospitals and schools, live weather & AQI, 7-day urban forecasts, traffic corridors, or road directions!`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setLastFailedQuery(null);

    const userMsg: AssistantResponse = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const responseMsg = await executeCityAssistantQuery(text, {
        city: currentCity,
        geminiApiKey,
        conversationHistory: messages,
      });
      setMessages((prev) => [...prev, responseMsg]);
    } catch (err: unknown) {
      setLastFailedQuery(text);
      const errorMsg = err instanceof Error ? err.message : 'Connection timeout or network failure.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${errorMsg}`,
          timestamp: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClearChat() {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: `Conversation reset. How can I assist you with **${currentCity.name}** city intelligence?`,
        timestamp: new Date().toISOString(),
      },
    ]);
    setLastFailedQuery(null);
  }

  const promptSuggestions = [
    `Show hospitals within 5 km of ${currentCity.name}`,
    `What is the current weather and AQI?`,
    `Show the 7-day forecast for ${currentCity.name}`,
    `Find police stations near ${currentCity.name} Center`,
    `Are there any active civic alerts?`,
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-citynavy-text">
              CityPulse Intelligence Assistant
            </h2>
            <p className="text-xs text-slate-500 dark:text-citynavy-muted">
              Live GIS, atmospheric &amp; corridor telematics for {currentCity.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearChat}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-citynavy-secondary transition-colors"
            title="Clear Chat Conversation"
            aria-label="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Live Tools Active
          </span>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-5 shadow-sm h-[540px] flex flex-col justify-between">
        {/* Messages Log */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-citynavy-accent flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-200 dark:border-blue-900">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
                  msg.role === 'user'
                    ? 'bg-citynavy-accent text-white shadow-md shadow-blue-500/20'
                    : msg.error
                    ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300'
                    : 'bg-slate-50 dark:bg-citynavy-secondary/60 border border-slate-100 dark:border-citynavy-border text-slate-800 dark:text-slate-200'
                }`}
              >
                {/* Tool Invocation Badge */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border/60 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-citynavy-accent">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Executed Service: {msg.toolCalls[0].name}</span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                      Args: {JSON.stringify(msg.toolCalls[0].args)}
                    </div>
                  </div>
                )}

                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* Structured Action Quick-Action Buttons */}
                {msg.action && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-citynavy-border flex items-center gap-2">
                    {msg.action.type === 'calculate_route' && onPlanRouteTo && (
                      <button
                        onClick={() => {
                          const p: any = msg.action?.payload;
                          onPlanRouteTo(p.destination, p.lat, p.lng);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Open Turn-by-Turn Directions</span>
                      </button>
                    )}
                    {(msg.action.type === 'search_nearby' || msg.action.type === 'set_map_location') && onNavigateToTab && (
                      <button
                        onClick={() => onNavigateToTab('explore')}
                        className="px-2.5 py-1 rounded-lg bg-citynavy-accent hover:bg-blue-600 text-white font-bold text-[10px] flex items-center gap-1"
                      >
                        <Compass className="w-3 h-3" />
                        <span>Inspect on Explore Map</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Retry action on error */}
                {msg.error && lastFailedQuery && (
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSend(lastFailedQuery)}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry Request</span>
                    </button>
                  </div>
                )}

                <div
                  className={`text-[10px] text-right ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-citynavy-accent flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 dark:bg-citynavy-secondary/60 border border-slate-100 dark:border-citynavy-border rounded-2xl p-4 text-xs flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 text-citynavy-accent animate-spin" />
                <span>Querying live municipal data &amp; verifying records...</span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Bottom Suggested Chips & Input Form */}
        <div className="pt-3 border-t border-slate-100 dark:border-citynavy-border space-y-3">
          {/* Quick Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {promptSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(s)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-citynavy-secondary hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Form with Multi-line and Enter Support */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about facilities, weather, 7-day forecast, traffic, or routes (Shift+Enter for new line)..."
                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-citynavy-accent resize-none max-h-24"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all disabled:opacity-50 shadow-md shadow-blue-500/25 flex-shrink-0"
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
