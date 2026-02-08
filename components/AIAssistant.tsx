//components/AIAssistant.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { collection, query, where, doc, setDoc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Child } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Button from './Button';

interface AIAssistantProps {
  children: Child[];
  onEntryLogged: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'success' | 'error';
  text: string;
  timestamp: Date;
}

interface ParsedAction {
  success: boolean;
  action?: string;
  data?: any;
  confirmMessage?: string;
  error?: string;
  suggestion?: string;
}

export default function AIAssistant({ children, onEntryLogged }: AIAssistantProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<ParsedAction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Add welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          type: 'assistant',
          text: '👋 Hi! I can help you log entries quickly. Try saying:\n\n• "Emma nap started on back"\n• "Wet diaper for Lucas"\n• "Adelaide had 5oz bottle"\n• "Lunch for Emma - oatmeal and bananas"',
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  function addMessage(type: Message['type'], text: string) {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        type,
        text,
        timestamp: new Date(),
      },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setIsProcessing(true);

    try {
      // If there's a pending action and user says yes/confirm
      if (pendingAction && /^(yes|y|confirm|ok|sure|do it|yep|yeah)$/i.test(userMessage)) {
        await executeAction(pendingAction);
        setPendingAction(null);
        setIsProcessing(false);
        return;
      }

      // If user says no/cancel
      if (pendingAction && /^(no|n|cancel|nope|nevermind)$/i.test(userMessage)) {
        addMessage('assistant', 'Okay, cancelled. What else can I help with?');
        setPendingAction(null);
        setIsProcessing(false);
        return;
      }

      // Clear any pending action
      setPendingAction(null);

      // Call AI to parse the command
      const response = await fetch('/api/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          childrenNames: children.map(c => c.name),
        }),
      });

      const parsed: ParsedAction = await response.json();

      if (!parsed.success) {
        addMessage('error', parsed.error || 'I couldn\'t understand that.');
        if (parsed.suggestion) {
          addMessage('assistant', `💡 Try: "${parsed.suggestion}"`);
        }
        setIsProcessing(false);
        return;
      }

      // Find the child
      const childName = parsed.data?.childName;
      const matchedChild = findChild(childName);

      if (!matchedChild) {
        addMessage('error', `I couldn't find a child named "${childName}". Available children: ${children.map(c => c.name).join(', ')}`);
        setIsProcessing(false);
        return;
      }

      // Update parsed data with matched child
      parsed.data.childId = matchedChild.id;
      parsed.data.childName = matchedChild.name;

      // Ask for confirmation
      addMessage('assistant', `${parsed.confirmMessage}\n\nSay "yes" to confirm or "no" to cancel.`);
      setPendingAction(parsed);

    } catch (error: any) {
      console.error('AI Assistant error:', error);
      addMessage('error', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  function findChild(name: string): Child | undefined {
    if (!name) return undefined;
    const lowerName = name.toLowerCase();
    
    // Exact match first
    let match = children.find(c => c.name.toLowerCase() === lowerName);
    if (match) return match;

    // Partial match (starts with)
    match = children.find(c => c.name.toLowerCase().startsWith(lowerName));
    if (match) return match;

    // Contains match
    match = children.find(c => c.name.toLowerCase().includes(lowerName));
    return match;
  }

  async function executeAction(action: ParsedAction) {
    if (!user || !action.data) return;

    try {
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const childId = action.data.childId;

      switch (action.action) {
        case 'sleep_start':
        case 'sleep_check':
        case 'sleep_stop':
          await handleSleepAction(action, childId, dateKey, now);
          break;

        case 'diaper':
        case 'bottle':
        case 'meal':
          await handleCareAction(action, childId, dateKey, now);
          break;

        case 'activity':
          await handleActivityAction(action, childId, dateKey, now);
          break;

        default:
          addMessage('error', `Unknown action type: ${action.action}`);
          return;
      }

      addMessage('success', `✅ Done! Logged ${action.action.replace('_', ' ')} for ${action.data.childName}`);
      onEntryLogged();

    } catch (error: any) {
      console.error('Execute action error:', error);
      addMessage('error', `Failed to log entry: ${error.message}`);
    }
  }

  async function handleSleepAction(action: ParsedAction, childId: string, dateKey: string, now: Date) {
    const data = action.data;
    
    if (action.action === 'sleep_start') {
      // Start a new sleep session
      const sessionId = `session_${now.getTime()}`;
      const entryId = `sleep_${now.getTime()}`;

      const entryData = {
        childId,
        timestamp: now,
        type: 'start',
        position: data.position || 'Back',
        breathing: data.breathing || 'Normal',
        notes: data.notes || null,
        staffInitials: user!.initials || 'AI',
        staffId: user!.uid,
        sessionId,
      };

      await setDoc(doc(db, 'children', childId, 'sleepLogs', dateKey, 'entries', entryId), entryData);

      // Update active session
      await setDoc(doc(db, 'children', childId, 'activeSleep', 'current'), {
        sessionId,
        startTime: now,
        isActive: true,
      });

    } else if (action.action === 'sleep_check') {
      // Get active session
      const activeDoc = await getDoc(doc(db, 'children', childId, 'activeSleep', 'current'));
      if (!activeDoc.exists() || !activeDoc.data()?.isActive) {
        throw new Error(`${data.childName} is not currently sleeping`);
      }

      const sessionId = activeDoc.data().sessionId;
      const entryId = `sleep_${now.getTime()}`;

      const entryData = {
        childId,
        timestamp: now,
        type: 'check',
        position: data.position || 'Back',
        breathing: data.breathing || 'Normal',
        notes: data.notes || null,
        staffInitials: user!.initials || 'AI',
        staffId: user!.uid,
        sessionId,
      };

      await setDoc(doc(db, 'children', childId, 'sleepLogs', dateKey, 'entries', entryId), entryData);

    } else if (action.action === 'sleep_stop') {
      // Get active session
      const activeDoc = await getDoc(doc(db, 'children', childId, 'activeSleep', 'current'));
      if (!activeDoc.exists() || !activeDoc.data()?.isActive) {
        throw new Error(`${data.childName} is not currently sleeping`);
      }

      const sessionId = activeDoc.data().sessionId;
      const entryId = `sleep_${now.getTime()}`;

      const entryData = {
        childId,
        timestamp: now,
        type: 'stop',
        position: data.position || 'Back',
        breathing: data.breathing || 'Normal',
        mood: data.mood || 'Happy',
        notes: data.notes || null,
        staffInitials: user!.initials || 'AI',
        staffId: user!.uid,
        sessionId,
      };

      await setDoc(doc(db, 'children', childId, 'sleepLogs', dateKey, 'entries', entryId), entryData);

      // Clear active session
      await updateDoc(doc(db, 'children', childId, 'activeSleep', 'current'), {
        isActive: false,
        endTime: now,
      });
    }
  }

  async function handleCareAction(action: ParsedAction, childId: string, dateKey: string, now: Date) {
    const data = action.data;
    const entryId = `care_${now.getTime()}`;

    let entryData: any = {
      childId,
      type: action.action,
      timestamp: now,
      staffInitials: user!.initials || 'AI',
      staffId: user!.uid,
      createdAt: now,
    };

    if (action.action === 'diaper') {
      entryData.diaperType = data.diaperType || 'wet';
      if (data.notes) entryData.comments = data.notes;
    } else if (action.action === 'bottle') {
      entryData.amount = data.amount;
      if (data.notes) entryData.comments = data.notes;
    } else if (action.action === 'meal') {
      entryData.ingredients = data.ingredients;
      if (data.amount) entryData.amount = data.amount;
      if (data.notes) entryData.comments = data.notes;
    }

    await setDoc(doc(db, 'children', childId, 'careLogs', dateKey, 'entries', entryId), entryData);
  }

  async function handleActivityAction(action: ParsedAction, childId: string, dateKey: string, now: Date) {
    const data = action.data;
    const entryId = `activity_${now.getTime()}`;

    const entryData = {
      childId,
      category: data.category || '🎨 Activities',
      activityName: data.activityName,
      duration: data.duration || null,
      notes: data.notes || null,
      timestamp: now,
      staffInitials: user!.initials || 'AI',
      staffId: user!.uid,
      createdAt: now,
    };

    await setDoc(doc(db, 'children', childId, 'activityLogs', dateKey, 'entries', entryId), entryData);
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-50 flex items-center justify-center text-2xl"
        title="AI Assistant"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                <p className="text-xs opacity-90">Quick entry helper</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                    msg.type === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : msg.type === 'success'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : msg.type === 'error'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-2 text-sm text-gray-600">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a command..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                disabled={isProcessing}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={isProcessing || !input.trim()}
                className="rounded-full px-4 bg-gradient-to-r from-purple-600 to-blue-600"
              >
                Send
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
