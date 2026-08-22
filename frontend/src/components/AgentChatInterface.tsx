'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OAN_API, ensureAccount, storedKey } from '@/lib/oan';

function authHeaders(): Record<string, string> {
  const key = storedKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  ChevronRight,
  Plus,
  Clock,
  Zap,
  Activity,
  Copy,
  Check,
  Loader2,
  ArrowDown,
  MessageCircle,
  Hash,
  DollarSign,
  X,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  description?: string;
  pricing?: string;
  successRate?: number;
  isHealthy?: boolean;
  skillName?: string;
  avatarText?: string;
}

interface ChatMessage {
  id: number | string;
  role: 'user' | 'agent';
  content: string;
  created_at: string;
  cost_usdc?: string | null;
  job_id?: string | null;
  isStreaming?: boolean;
}

interface ChatSession {
  session_id: string;
  agent_id: number;
  agent_name: string;
  last_message: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface AgentChatInterfaceProps {
  agents: Agent[];
  preSelectedAgent?: Agent | null;
}

// ─── Markdown Renderer (lightweight) ───────────────────────────────

function renderMarkdown(text: string): string {
  let html = text
    // Code blocks (```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
      return `<pre><code class="${lang}">${escapeHtml(code.trim())}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  // Remove double-wrapped ul
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  return `<p>${html}</p>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Main Component ────────────────────────────────────────────────

export function AgentChatInterface({ agents, preSelectedAgent }: AgentChatInterfaceProps) {
  // These endpoints make agents perform paid work, so they need an account.
  useEffect(() => {
    ensureAccount().catch(() => undefined);
  }, []);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(preSelectedAgent || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showAgentList, setShowAgentList] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Handle scroll detection for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${OAN_API}/api/v1/chat/sessions`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch { /* silent */ }
  };

  const loadSession = async (sid: string) => {
    try {
      const res = await fetch(`${OAN_API}/api/v1/chat/sessions/${sid}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setSessionId(sid);
        setShowSessions(false);
      }
    } catch { /* silent */ }
  };

  const startNewChat = (agent: Agent) => {
    setSelectedAgent(agent);
    setMessages([]);
    setSessionId(null);
    setShowSessions(false);
    setShowAgentList(false);
    textareaRef.current?.focus();
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !selectedAgent || isLoading) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Auto-resize textarea back
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }

    // Add typing indicator
    const typingMsg: ChatMessage = {
      id: 'typing',
      role: 'agent',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, typingMsg]);

    try {
      const res = await fetch(`${OAN_API}/api/v1/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          agent_id: parseInt(selectedAgent.id, 10),
          message: userMessage.content,
          session_id: sessionId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Update session ID
        if (data.session_id) {
          setSessionId(data.session_id);
        }

        // Replace typing indicator with actual response
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== 'typing');
          return [...filtered, {
            id: data.agent_message?.id || Date.now(),
            role: 'agent' as const,
            content: data.agent_message?.content || 'No response received.',
            created_at: data.agent_message?.created_at || new Date().toISOString(),
            cost_usdc: data.agent_message?.cost_usdc,
            job_id: data.agent_message?.job_id,
          }];
        });
      } else {
        // The hub reports an unreachable agent honestly now, rather than
        // fabricating a reply, so show what it actually said.
        const detail = await res.json().catch(() => null);
        setMessages(prev => prev.filter(m => m.id !== 'typing'));
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'agent',
          content: detail?.message
            ? `⚠️ ${detail.message}`
            : '⚠️ Failed to get a response from the agent. Please try again.',
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== 'typing'));
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'agent',
        content: '⚠️ Network error. Ensure the API server is running on port 3001.',
        created_at: new Date().toISOString(),
      }]);
    }

    setIsLoading(false);
    fetchSessions();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = '44px';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-64px)] max-w-[1200px] mx-auto">
      {/* ─── Left Sidebar: Agent Selector ──────────────────────────── */}
      <div className={`${showAgentList ? 'w-[280px]' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-[#2C2C2E] bg-[#151517] flex-shrink-0`}>
        <div className="p-4 border-b border-[#2C2C2E]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-400" />
              Agents
            </h3>
            <button
              onClick={() => { setShowSessions(!showSessions); }}
              className="text-xs text-[#98989E] hover:text-white transition-colors flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              History
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => { setSelectedAgent(null); setMessages([]); setSessionId(null); }}
            className="w-full rounded-lg border border-dashed border-[#2C2C2E] bg-[#1C1C1E] py-2.5 text-xs font-medium text-[#98989E] hover:text-white hover:border-blue-500/40 hover:bg-[#1E293B] transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>

        {/* Sessions List */}
        <AnimatePresence>
          {showSessions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-[#2C2C2E] overflow-hidden"
            >
              <div className="p-3 max-h-[200px] overflow-y-auto chat-scrollbar">
                {sessions.length === 0 ? (
                  <p className="text-xs text-[#636366] text-center py-4">No chat history yet</p>
                ) : (
                  sessions.map((s) => (
                    <button
                      key={s.session_id}
                      onClick={() => loadSession(s.session_id)}
                      className={`w-full text-left p-2.5 rounded-lg mb-1.5 transition-all text-xs ${
                        sessionId === s.session_id
                          ? 'bg-[#1E293B] border border-blue-500/30 text-white'
                          : 'bg-[#1C1C1E] border border-transparent hover:border-[#2C2C2E] text-[#98989E] hover:text-white'
                      }`}
                    >
                      <div className="font-medium truncate">{s.agent_name}</div>
                      <div className="text-[10px] text-[#636366] mt-0.5 truncate">
                        {s.message_count} messages · {new Date(s.updated_at).toLocaleDateString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent List */}
        <div className="overflow-y-auto chat-scrollbar" style={{ maxHeight: showSessions ? 'calc(100vh - 350px)' : 'calc(100vh - 200px)' }}>
          {agents.length === 0 ? (
            <div className="p-6 text-center">
              <Bot className="w-8 h-8 text-[#636366] mx-auto mb-2" />
              <p className="text-xs text-[#636366]">No agents registered yet</p>
            </div>
          ) : (
            agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => startNewChat(agent)}
                className={`w-full text-left p-3.5 border-b border-[#1C1C1E] transition-all group ${
                  selectedAgent?.id === agent.id
                    ? 'bg-[#1E293B]/60 border-l-2 border-l-blue-500'
                    : 'hover:bg-[#1C1C1E] border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Agent Avatar */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    selectedAgent?.id === agent.id
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-[#242426] text-[#98989E] group-hover:text-white'
                  }`}>
                    {agent.avatarText || agent.name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${agent.isHealthy !== false ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    </div>
                    <p className="text-[11px] text-[#636366] mt-0.5 truncate">
                      {agent.skillName || 'General Task'} · {agent.pricing || '$0.00'}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#636366] opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ─── Main Chat Area ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#121212] relative">
        {/* Chat Header */}
        {selectedAgent && (
          <div className="h-14 border-b border-[#2C2C2E] bg-[#151517]/90 backdrop-blur-md flex items-center px-4 gap-3 shrink-0">
            {/* Toggle sidebar button (mobile + desktop) */}
            <button
              onClick={() => setShowAgentList(!showAgentList)}
              className="w-8 h-8 rounded-lg bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#98989E] hover:text-white transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>

            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{selectedAgent.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">Online</span>
              </div>
              <p className="text-[11px] text-[#636366] truncate">
                {selectedAgent.skillName || 'AI Agent'} · {selectedAgent.pricing || '$0.00'} USDC/task
              </p>
            </div>

            {sessionId && (
              <div className="flex items-center gap-1.5 text-[10px] text-[#636366] bg-[#1C1C1E] px-2.5 py-1 rounded-lg border border-[#2C2C2E]">
                <Hash className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{sessionId}</span>
              </div>
            )}
          </div>
        )}

        {/* Messages Area */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto chat-scrollbar px-4 py-6"
        >
          {!selectedAgent ? (
            /* Empty State — No Agent Selected */
            <div className="h-full flex flex-col items-center justify-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center mb-5">
                <MessageCircle className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Agent Chat</h2>
              <p className="text-sm text-[#98989E] text-center max-w-[360px] mb-6 leading-relaxed">
                Select an agent from the sidebar to start a conversation. Chat directly with AI agents over the A2A protocol.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-[400px] w-full">
                {agents.slice(0, 4).map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => startNewChat(agent)}
                    className="p-3.5 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] hover:border-blue-500/30 hover:bg-[#1E293B]/40 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-[#242426] flex items-center justify-center text-xs font-bold text-[#98989E] group-hover:text-blue-400 transition-colors">
                        {agent.avatarText || agent.name?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                      <span className="text-xs font-semibold text-white truncate">{agent.name}</span>
                    </div>
                    <p className="text-[10px] text-[#636366] truncate">{agent.skillName || 'General Task'}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* Empty Chat — Suggestions */
            <div className="h-full flex flex-col items-center justify-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Chat with {selectedAgent.name}</h3>
              <p className="text-sm text-[#98989E] mb-6 text-center max-w-[340px]">
                Send a message to get started. Each interaction is processed through the A2A protocol.
              </p>

              {/* Quick prompts */}
              <div className="grid grid-cols-1 gap-2 max-w-[420px] w-full">
                {[
                  { icon: '🔍', text: 'Run a security audit on my codebase' },
                  { icon: '🧪', text: 'Write test cases for my API endpoints' },
                  { icon: '📝', text: 'Explain how the A2A protocol works' },
                  { icon: '👋', text: 'Hello! What can you help me with?' },
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => { setInputValue(prompt.text); textareaRef.current?.focus(); }}
                    className="w-full text-left p-3 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#3E3E42] transition-all text-sm text-[#98989E] hover:text-white flex items-center gap-3"
                  >
                    <span className="text-base">{prompt.icon}</span>
                    <span>{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message List */
            <div className="max-w-[720px] mx-auto space-y-4">
              {messages.map((msg, idx) => (
                <div key={msg.id} className="chat-message-enter" style={{ animationDelay: `${idx * 0.05}s` }}>
                  {msg.role === 'user' ? (
                    /* User Message */
                    <div className="flex justify-end">
                      <div className="max-w-[85%] flex items-start gap-2.5">
                        <div className="bg-blue-600 rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm">
                          <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                      </div>
                    </div>
                  ) : msg.isStreaming ? (
                    /* Typing Indicator */
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#242426] flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Agent Message */
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#242426] flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="max-w-[85%] flex flex-col">
                        <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm relative group">
                          {/* Markdown rendered content */}
                          <div
                            className="markdown-content text-sm text-[#E4E4E7] leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                          />

                          {/* Copy button */}
                          <button
                            onClick={() => copyToClipboard(msg.content, String(msg.id))}
                            className="absolute top-2 right-2 w-6 h-6 rounded-md bg-[#242426] border border-[#2C2C2E] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copiedId === String(msg.id)
                              ? <Check className="w-3 h-3 text-emerald-400" />
                              : <Copy className="w-3 h-3 text-[#636366]" />
                            }
                          </button>
                        </div>

                        {/* Meta info: cost + job ID */}
                        {(msg.cost_usdc || msg.job_id) && (
                          <div className="flex items-center gap-3 mt-1.5 px-1">
                            {msg.cost_usdc && parseFloat(msg.cost_usdc) > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-400/70">
                                <DollarSign className="w-2.5 h-2.5" />
                                {msg.cost_usdc} USDC
                              </span>
                            )}
                            {msg.job_id && (
                              <span className="flex items-center gap-1 text-[10px] text-[#636366]">
                                <Activity className="w-2.5 h-2.5" />
                                {msg.job_id}
                              </span>
                            )}
                            <span className="text-[10px] text-[#636366]">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollDown && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="absolute bottom-24 right-6 w-9 h-9 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center shadow-lg hover:bg-[#242426] transition-colors z-10"
            >
              <ArrowDown className="w-4 h-4 text-white" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ─── Input Bar ──────────────────────────────────────────── */}
        {selectedAgent && (
          <div className="border-t border-[#2C2C2E] bg-[#151517]/90 backdrop-blur-md px-4 py-3 shrink-0">
            <div className="max-w-[720px] mx-auto">
              <div className="flex items-end gap-2.5">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleTextareaResize}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${selectedAgent.name}...`}
                    disabled={isLoading}
                    rows={1}
                    className="w-full bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#636366] focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 resize-none transition-all disabled:opacity-50"
                    style={{ minHeight: '44px', maxHeight: '160px' }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="h-[44px] w-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-[#242426] disabled:text-[#636366] text-white flex items-center justify-center transition-all shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    <Send className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-[#636366] mt-1.5 text-center">
                Press <kbd className="px-1 py-0.5 rounded bg-[#1C1C1E] border border-[#2C2C2E] text-[#98989E]">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-[#1C1C1E] border border-[#2C2C2E] text-[#98989E]">Shift+Enter</kbd> for new line
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
