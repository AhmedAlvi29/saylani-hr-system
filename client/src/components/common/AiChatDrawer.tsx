import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User as UserIcon,
  RotateCcw,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Badge } from './Badge';

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveApplied?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isAiGenerated?: boolean;
  smartLeaveData?: {
    leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
    startDate: string;
    endDate: string;
    reason: string;
  };
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({ isOpen, onClose, onLeaveApplied }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${user?.name || ''}! I am your HCM Lite AI Assistant. You can ask me real-time questions about company headcount, today's attendance rate, late comers, remaining leave balances, or request a smart leave application in plain words.`,
      isAiGenerated: true,
    },
  ]);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState<boolean>(false);
  const [leaveSuccessMsg, setLeaveSuccessMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const role = user?.role || 'employee';

  const suggestedPrompts =
    role === 'employee'
      ? [
          'How many sick leaves do I have left this year?',
          'Need next Monday and Tuesday off for sister wedding',
          'Who is on leave today?',
          'What is office grace period policy?',
          'What is my colleague salary?', // to test refusal
        ]
      : [
          'How many active employees are in the company?',
          'What is today attendance rate?',
          'Who came late most often this month?',
          'Who is on leave today?',
          'Show payroll summary for this month',
          'What is attendance penalty policy?',
        ];

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || prompt).trim();
    if (!query || isLoading) return;

    setPrompt('');
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Check if it looks like a smart leave request
      const lower = query.toLowerCase();
      const isLeaveIntent =
        lower.includes('off') ||
        lower.includes('leave') ||
        lower.includes('chutti') ||
        lower.includes('vacation');

      if (isLeaveIntent && (lower.includes('need') || lower.includes('want') || lower.includes('chahiye') || lower.includes('apply'))) {
        const smartLeave = await apiRequest<{
          leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
          startDate: string;
          endDate: string;
          reason: string;
        }>('/ai/smart-leave', {
          method: 'POST',
          body: JSON.stringify({ prompt: query }),
        });

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: `I've prepared a smart leave application for you based on your request. Please review the extracted details and click "Confirm & Submit":`,
            isAiGenerated: true,
            smartLeaveData: smartLeave,
          },
        ]);
      } else {
        const res = await apiRequest<{
          answer: string;
          isAiGenerated: boolean;
        }>('/ai/chat', {
          method: 'POST',
          body: JSON.stringify({ prompt: query }),
        });

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: res.answer,
            isAiGenerated: true,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: err.message || 'I encountered an issue retrieving data. Please try again.',
          isAiGenerated: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSmartLeave = async (smartData: any) => {
    setIsSubmittingLeave(true);
    setLeaveSuccessMsg(null);
    try {
      await apiRequest('/leaves/apply', {
        method: 'POST',
        body: JSON.stringify(smartData),
      });

      setLeaveSuccessMsg('Leave application successfully submitted for HR approval!');
      if (onLeaveApplied) onLeaveApplied();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-border shadow-soft-lg flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-lavender-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-soft">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-main flex items-center gap-1.5">
                  HCM AI Assistant
                  <span className="text-[10px] font-semibold text-primary px-1.5 py-0.2 bg-white rounded border border-indigo-200">
                    Live Tools
                  </span>
                </h3>
                <p className="text-[11px] text-slate-muted">
                  Scoped to role: <span className="font-semibold capitalize">{role}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setMessages([
                    {
                      id: 'welcome',
                      sender: 'assistant',
                      text: `Conversation reset. How can I help you today?`,
                      isAiGenerated: true,
                    },
                  ])
                }
                title="Reset conversation"
                aria-label="Reset conversation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                aria-label="Close AI Assistant drawer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100 overflow-x-auto flex gap-1.5 no-scrollbar">
            {suggestedPrompts.map((sp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(sp)}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-lavender-100 text-slate-600 hover:text-primary border border-slate-200 transition-colors shadow-soft-sm"
              >
                {sp}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-background">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-primary text-white shadow-soft rounded-tr-xs'
                      : 'bg-white text-slate-main border border-slate-border shadow-soft rounded-tl-xs'
                  }`}
                >
                  {/* AI Generated tag */}
                  {m.isAiGenerated && (
                    <div className="flex items-center gap-1 text-[10px] text-primary font-medium mb-1.5">
                      <Sparkles className="w-3 h-3" />
                      <span>AI-generated from verified database</span>
                    </div>
                  )}

                  <div className="whitespace-pre-line">{m.text}</div>

                  {/* Smart Leave Confirmation Card */}
                  {m.smartLeaveData && (
                    <div className="mt-3 p-3 bg-lavender-50 rounded-xl border border-indigo-200 text-slate-main">
                      <div className="font-semibold text-[11px] text-indigo-900 mb-1.5 flex items-center gap-1">
                        <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                        Pre-filled Leave Application
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-700">
                        <div>
                          <span className="font-semibold">Type:</span>{' '}
                          <span className="capitalize">{m.smartLeaveData.leaveType}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Dates:</span> {m.smartLeaveData.startDate} to{' '}
                          {m.smartLeaveData.endDate}
                        </div>
                        <div>
                          <span className="font-semibold">Reason:</span> {m.smartLeaveData.reason}
                        </div>
                      </div>

                      {leaveSuccessMsg ? (
                        <div className="mt-2.5 text-emerald-700 bg-emerald-100 p-2 rounded-lg text-[11px] flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-4 h-4" /> {leaveSuccessMsg}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConfirmSmartLeave(m.smartLeaveData)}
                          disabled={isSubmittingLeave}
                          className="mt-2.5 w-full py-1.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors text-xs flex items-center justify-center gap-1.5 shadow-soft"
                        >
                          {isSubmittingLeave ? 'Submitting...' : 'Confirm & Apply Leave'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="bg-white border border-slate-border rounded-2xl rounded-tl-xs p-3 text-xs text-slate-muted flex items-center gap-2 shadow-soft">
                  <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span>Checking database & rules...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask headcount, attendance, leaves, or policy..."
                aria-label="Ask AI assistant a question"
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!prompt.trim() || isLoading}
                className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white shadow-soft transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
