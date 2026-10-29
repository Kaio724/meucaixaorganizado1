import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Plus, 
  History as HistoryIcon, 
  Trash2, 
  Copy, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Bot, 
  User, 
  X,
  TrendingUp,
  FileText,
  DollarSign,
  PieChart,
  Calendar,
  Lock
} from 'lucide-react';
import { UserProfile, Transaction, AccountType, AiConversation, AiChatMessage } from '../types';
import { 
  sendAiChatMessage, 
  fetchAiConversations, 
  saveAiConversation, 
  deleteAiConversation 
} from '../lib/aiChatService';

interface AiReportsChatProps {
  profile: UserProfile;
  userId: string;
  accountType: AccountType;
  transactions: Transaction[];
  authToken?: string;
  onNavigateToTab?: (tab: any) => void;
}

const INITIAL_SUGGESTIONS = [
  {
    icon: FileText,
    title: 'Relatório Mensal',
    prompt: 'Faça um relatório financeiro deste mês.',
  },
  {
    icon: PieChart,
    title: 'Receitas vs Despesas',
    prompt: 'Analise minhas receitas e despesas.',
  },
  {
    icon: DollarSign,
    title: 'Maiores Gastos',
    prompt: 'Onde estou gastando mais dinheiro?',
  },
  {
    icon: TrendingUp,
    title: 'Comparativo Mensal',
    prompt: 'Compare meu desempenho com o mês anterior.',
  },
  {
    icon: Calendar,
    title: 'A Pagar e Receber',
    prompt: 'Quais contas ainda preciso pagar ou receber?',
  },
  {
    icon: Sparkles,
    title: 'Dicas de Otimização',
    prompt: 'O que posso fazer para melhorar minha organização financeira?',
  },
];

export default function AiReportsChat({
  profile,
  userId,
  accountType,
  transactions,
  authToken,
  onNavigateToTab,
}: AiReportsChatProps) {
  const isPro = (profile.plan || 'essential') === 'pro';

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations on mount or when accountType / userId changes
  useEffect(() => {
    let isMounted = true;

    async function loadConversations() {
      try {
        const list = await fetchAiConversations(userId, accountType);
        if (isMounted) {
          setConversations(list);
          if (list.length > 0) {
            // Select the most recent conversation by default
            const mostRecent = list[0];
            setActiveConversationId(mostRecent.id);
            setMessages(mostRecent.messages || []);
          } else {
            setActiveConversationId(null);
            setMessages([]);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar histórico de conversas com IA:', err);
      }
    }

    loadConversations();

    return () => {
      isMounted = false;
    };
  }, [userId, accountType]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleStartNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setErrorText(null);
    setInputMessage('');
    setShowHistoryDrawer(false);
  };

  const handleSelectConversation = (conversation: AiConversation) => {
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages || []);
    setErrorText(null);
    setShowHistoryDrawer(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    try {
      await deleteAiConversation(conversationId, userId, accountType);
      const updatedList = conversations.filter(c => c.id !== conversationId);
      setConversations(updatedList);
      if (activeConversationId === conversationId) {
        if (updatedList.length > 0) {
          setActiveConversationId(updatedList[0].id);
          setMessages(updatedList[0].messages || []);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.warn('Erro ao excluir conversa:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputMessage).trim();
    if (!prompt || isLoading) return;

    setErrorText(null);
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMessage: AiChatMessage = {
      id: 'msg_user_' + Date.now(),
      role: 'user',
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    const newMessagesList = [...messages, userMessage];
    setMessages(newMessagesList);
    setIsLoading(true);

    try {
      // Build lightweight history payload
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendAiChatMessage({
        message: prompt,
        conversationId: activeConversationId || undefined,
        history: historyPayload,
        accountType,
        transactions,
        authToken,
        userId,
      });

      const assistantMessage: AiChatMessage = {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: res.reply,
        createdAt: new Date().toISOString(),
      };

      const finalMessages = [...newMessagesList, assistantMessage];
      setMessages(finalMessages);

      // Persist conversation
      const conversationId = activeConversationId || 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const conversationTitle = res.title || (messages.length === 0 ? prompt.slice(0, 28) : 'Relatório Financeiro');

      const updatedConv: AiConversation = {
        id: conversationId,
        userId,
        accountType,
        title: conversationTitle,
        createdAt: activeConversationId ? (conversations.find(c => c.id === activeConversationId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: finalMessages,
      };

      setActiveConversationId(conversationId);
      await saveAiConversation(updatedConv);

      setConversations(prev => {
        const filtered = prev.filter(c => c.id !== conversationId);
        return [updatedConv, ...filtered];
      });
    } catch (err: any) {
      console.error('Falha ao obter resposta do Gemini:', err);
      setErrorText(err.message || 'Não foi possível gerar a resposta com a inteligência artificial. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Helper to render formatted text with markdown-like highlights
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');

    return (
      <div className="space-y-2 text-[13.5px] leading-relaxed text-zinc-200 font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Title / Main heading
          if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
            const cleanTitle = trimmed.replace(/^#+\s*/, '');
            return (
              <h3 key={idx} className="text-base sm:text-lg font-black text-white mt-4 mb-2 tracking-tight flex items-center gap-2 border-b border-white/10 pb-1.5">
                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                {cleanTitle}
              </h3>
            );
          }

          // Section Header with bold number
          if (/^\*\*[0-9]+\.\s+.*?\*\*/.test(trimmed) || /^[0-9]+\.\s+\*\*.*?\*\*/.test(trimmed)) {
            const clean = trimmed.replace(/\*\*/g, '');
            return (
              <h4 key={idx} className="text-sm font-extrabold text-[#c4b5fd] mt-3 mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">arrow_right</span>
                {clean}
              </h4>
            );
          }

          // Bullet points
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const textContent = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start gap-2 pl-2 text-zinc-300">
                <span className="text-primary font-bold mt-1 text-xs">•</span>
                <span className="flex-1">
                  {formatInlineText(textContent)}
                </span>
              </div>
            );
          }

          // Empty line
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Normal paragraph
          return (
            <p key={idx} className="text-zinc-200">
              {formatInlineText(line)}
            </p>
          );
        })}
      </div>
    );
  };

  // Helper to bold items and highlight currency values
  const formatInlineText = (text: string) => {
    // Split by markdown bold tags **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        return (
          <strong key={i} className="font-bold text-white">
            {highlightCurrencies(inner)}
          </strong>
        );
      }
      return <span key={i}>{highlightCurrencies(part)}</span>;
    });
  };

  const highlightCurrencies = (str: string) => {
    // Regex for Brazilian currency: R$ X.XXX,XX
    const currencyRegex = /(R\$\s*[\d\.\,]+)/g;
    const segments = str.split(currencyRegex);

    return segments.map((seg, idx) => {
      if (seg.match(currencyRegex)) {
        return (
          <span key={idx} className="font-extrabold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
            {seg}
          </span>
        );
      }
      return seg;
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] min-h-[550px] relative text-left">
      
      {/* Top Header Card */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#171228]/90 via-[#151024]/95 to-[#0d0a18]/90 p-4 sm:p-5 rounded-[24px] border border-primary/25 backdrop-blur-xl shadow-xl shrink-0 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#9333ea] border border-[#c4b5fd]/40 flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            <span className="material-symbols-outlined text-xl font-bold">auto_awesome</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Relatórios com IA
              </h2>
              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                accountType === 'pessoal'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-primary/20 text-primary border-primary/35'
              }`}>
                {accountType === 'pessoal' ? 'Conta Pessoal' : 'Conta Empresarial'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">
              Assistente inteligente analisando seus dados reais do MCO
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleStartNewConversation}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-all cursor-pointer tap-target"
            title="Iniciar nova conversa"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Nova Análise</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold border border-white/10 transition-all cursor-pointer relative tap-target"
            title="Histórico de conversas"
          >
            <HistoryIcon className="w-3.5 h-3.5 text-[#c4b5fd]" />
            <span className="hidden sm:inline">Histórico</span>
            {conversations.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-[#131315]"></span>
            )}
          </button>
        </div>
      </div>

      {/* Main Chat Content Card */}
      <div className="flex-1 bg-[#120f20]/90 rounded-[28px] border border-primary/20 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 contain-scroll">
          
          {/* Welcome Screen when no messages */}
          {messages.length === 0 && (
            <div className="h-full flex flex-col justify-center items-center py-6 px-2 text-center max-w-xl mx-auto animate-fade-in">
              <div className="w-14 h-14 rounded-3xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_25px_rgba(208,188,255,0.25)] mb-4">
                <span className="material-symbols-outlined text-3xl font-bold">psychology</span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Olá, {profile.name.split(' ')[0]}! Como posso ajudar você hoje?
              </h3>
              
              <p className="text-xs text-zinc-400 mt-1.5 mb-6 max-w-md leading-relaxed">
                Estou conectado às suas movimentações financeiras da <strong className="text-white">{accountType === 'pessoal' ? 'Conta Pessoal' : 'Conta Empresarial'}</strong>. Posso gerar relatórios completos, apontar despesas, comparar períodos e tirar dúvidas.
              </p>

              {/* Suggestions Grid */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                {INITIAL_SUGGESTIONS.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt)}
                      className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-primary/30 text-left transition-all duration-200 group cursor-pointer flex items-center gap-3 active:scale-[0.98]"
                    >
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-white block truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate block mt-0.5">
                          {item.prompt}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-zinc-500 group-hover:text-primary transition-colors">
                        arrow_forward
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Render Active Messages */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#9333ea] border border-[#c4b5fd]/30 flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
                    <span className="material-symbols-outlined text-sm font-bold">auto_awesome</span>
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[78%] rounded-[22px] p-3.5 sm:p-4.5 shadow-lg relative group ${
                  isUser
                    ? 'bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] text-white rounded-tr-sm border border-purple-400/20'
                    : 'bg-[#181428]/95 border border-primary/20 rounded-tl-sm text-zinc-200'
                }`}>
                  {/* Sender Header for Assistant */}
                  {!isUser && (
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5">
                      <span className="text-[10px] font-extrabold text-[#c4b5fd] tracking-wider uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Assistente MCO
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                        title="Copiar relatório"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Message Content */}
                  {isUser ? (
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  ) : (
                    renderFormattedContent(msg.content)
                  )}

                  {/* Timestamp */}
                  <span className={`text-[9px] mt-2 block text-right font-medium ${
                    isUser ? 'text-purple-200/70' : 'text-zinc-500'
                  }`}>
                    {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-purple-900/60 border border-purple-500/30 flex items-center justify-center text-purple-200 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Typing Loading Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 justify-start"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#9333ea] border border-[#c4b5fd]/30 flex items-center justify-center text-white shrink-0 mt-1 shadow-md animate-pulse">
                <span className="material-symbols-outlined text-sm font-bold">auto_awesome</span>
              </div>

              <div className="bg-[#181428]/95 border border-primary/20 rounded-[22px] rounded-tl-sm p-4 text-zinc-300 shadow-lg flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                </div>
                <span className="text-xs font-semibold text-zinc-300 tracking-tight">
                  Analisando movimentações financeiras...
                </span>
              </div>
            </motion.div>
          )}

          {/* Error Banner with Retry */}
          {errorText && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-300 text-xs font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorText}</span>
              </div>
              <button
                type="button"
                onClick={() => handleSendMessage(messages[messages.length - 1]?.content || '')}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                Tentar Novamente
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-[#100d1c] border-t border-white/5 flex flex-col gap-2">
          
          {/* Quick Follow-up Pills (when chat is active) */}
          {messages.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 contain-scroll no-scrollbar">
              <button
                type="button"
                onClick={() => handleSendMessage('Faça um resumo executivo mais curto deste relatório.')}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-semibold whitespace-nowrap border border-white/5 transition-colors cursor-pointer shrink-0"
              >
                Resumo mais curto
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Quais foram exatamente minhas 3 maiores despesas?')}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-semibold whitespace-nowrap border border-white/5 transition-colors cursor-pointer shrink-0"
              >
                3 maiores despesas
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Quais contas estão previstas para os próximos dias?')}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-semibold whitespace-nowrap border border-white/5 transition-colors cursor-pointer shrink-0"
              >
                Próximos vencimentos
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Como posso reduzir custos sem prejudicar a rotina?')}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-semibold whitespace-nowrap border border-white/5 transition-colors cursor-pointer shrink-0"
              >
                Dicas de economia
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 bg-[#171324] border border-primary/25 rounded-2xl p-1.5 pl-3 focus-within:border-primary/60 transition-colors shadow-inner">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Pergunte algo sobre suas finanças da ${accountType === 'pessoal' ? 'Conta Pessoal' : 'Conta Empresarial'}...`}
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent text-white text-xs sm:text-sm placeholder:text-zinc-500 focus:outline-none resize-none max-h-32 py-1.5 leading-relaxed"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] hover:from-[#8b4bf0] hover:to-[#a855f7] disabled:opacity-40 disabled:hover:from-[#7C3AED] disabled:hover:to-[#9333ea] text-white flex items-center justify-center transition-all cursor-pointer shadow-[0_0_12px_rgba(124,58,237,0.4)] shrink-0 active:scale-95"
              title="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
            <span>Pressione <strong className="text-zinc-400 font-semibold">Enter</strong> para enviar, <strong className="text-zinc-400 font-semibold">Shift+Enter</strong> para nova linha</span>
            <span>Google Gemini 3.8 Flash</span>
          </div>
        </div>

        {/* History Drawer Modal */}
        <AnimatePresence>
          {showHistoryDrawer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex justify-end"
            >
              <div 
                className="absolute inset-0 cursor-default" 
                onClick={() => setShowHistoryDrawer(false)} 
              />

              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="relative w-full max-w-sm bg-[#151124] border-l border-primary/25 h-full flex flex-col p-4 shadow-2xl z-10"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <HistoryIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-black text-white">Histórico de Análises</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHistoryDrawer(false)}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="my-3">
                  <button
                    type="button"
                    onClick={handleStartNewConversation}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9333ea] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    + Nova Análise Financeira
                  </button>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto space-y-2 contain-scroll pr-1">
                  {conversations.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      Nenhuma conversa anterior salva nesta conta.
                    </div>
                  ) : (
                    conversations.map((conv) => {
                      const isSelected = conv.id === activeConversationId;
                      return (
                        <div
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2 group ${
                            isSelected
                              ? 'bg-primary/20 border-primary/40 text-white shadow-sm'
                              : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/5 text-zinc-300'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold block truncate">
                              {conv.title}
                            </span>
                            <span className="text-[10px] text-zinc-500 block mt-1">
                              {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString('pt-BR')} • {conv.messages?.length || 0} mensagens
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteConversation(e, conv.id)}
                            className="text-zinc-500 hover:text-rose-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                            title="Excluir conversa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
