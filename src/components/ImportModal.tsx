import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Upload, Sparkles, AlertTriangle, CheckCircle2, 
  Trash2, Loader2, ArrowUpRight, ArrowDownRight, 
  Clock, Check, Eye, HelpCircle, ChevronRight
} from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { AVAILABLE_CATEGORIES, PAYMENT_METHODS } from '../initialData';
import * as XLSX from 'xlsx';

// Plan URL
const CHECKOUT_PRO_URL = import.meta.env.VITE_CHECKOUT_PRO_URL || 'https://pay.cakto.com.br/rdvxqwt';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void> | void;
  onUpgradePlan?: () => void;
}

interface ParsedTransaction {
  id: string;
  date: string;
  title: string;
  type: 'entrada' | 'saida';
  amount: number;
  paymentMethod: string;
  category: string;
  confidence: number;
  selected: boolean;
}

export default function ImportModal({ isOpen, onClose, profile, onAddTransaction, onUpgradePlan }: ImportModalProps) {
  const isPro = (profile.plan || 'essential') === 'pro';
  const monthlyLimit = isPro ? 50 : 20;

  // Flow State
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'success' | 'limit_exceeded'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Remaining Credits State
  const [remainingCredits, setRemainingCredits] = useState(monthlyLimit);

  // Parsing & Review State
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Estamos analisando seu extrato...');
  const [transactionsToReview, setTransactionsToReview] = useState<ParsedTransaction[]>([]);
  const [summaryData, setSummaryData] = useState({
    totalImported: 0,
    entradasCount: 0,
    saidasCount: 0,
    totalVolume: 0,
    timeSavedMinutes: 0
  });

  // Calculate remaining credits
  useEffect(() => {
    if (isOpen) {
      const date = new Date();
      const currentMonth = `${date.getMonth() + 1}/${date.getFullYear()}`;
      const creditsKey = `mco_credits_monthly_${profile.name || 'default'}`;
      const stored = localStorage.getItem(creditsKey);
      let count = 0;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.month === currentMonth) {
            count = parsed.count;
          }
        } catch (e) {
          // ignore
        }
      }
      setRemainingCredits(Math.max(0, monthlyLimit - count));
    }
  }, [isOpen, monthlyLimit, profile.name]);

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Handle Drag Leave
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Check and consume credit
  const consumeCredit = (): boolean => {
    const date = new Date();
    const currentMonth = `${date.getMonth() + 1}/${date.getFullYear()}`;
    const creditsKey = `mco_credits_monthly_${profile.name || 'default'}`;
    const stored = localStorage.getItem(creditsKey);
    let count = 0;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.month === currentMonth) {
          count = parsed.count;
        }
      } catch (e) {
        // ignore
      }
    }

    if (count + 5 > monthlyLimit) {
      setStep('limit_exceeded');
      return false;
    }

    localStorage.setItem(creditsKey, JSON.stringify({ month: currentMonth, count: count + 5 }));
    setRemainingCredits(monthlyLimit - (count + 5));
    return true;
  };

  // Process File Select
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMsg(null);
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'xlsx', 'xls', 'csv', 'txt', 'docx'];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      setErrorMsg('Formato de arquivo não suportado. Envie PDF, XLSX, XLS, CSV, TXT ou DOCX.');
      return;
    }

    // Limit file size to 15MB
    if (selectedFile.size > 15 * 1024 * 1024) {
      setErrorMsg('O arquivo é muito grande. O tamanho máximo permitido é 15MB.');
      return;
    }

    setFile(selectedFile);
  };

  // Perform PDF/Excel parsing & send to API
  const handleStartImport = async () => {
    if (!file) return;

    // Check credits
    if (!consumeCredit()) {
      return;
    }

    setStep('processing');
    setProgress(5);
    setStatusMessage('Estamos enviando seu extrato...');

    // Progress bar simulation interval
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 25) {
          setStatusMessage('Estamos analisando seu extrato...');
          return prev + 1.5;
        } else if (prev < 55) {
          setStatusMessage('Identificando movimentações...');
          return prev + 1.2;
        } else if (prev < 80) {
          setStatusMessage('Lendo datas e valores...');
          return prev + 0.8;
        } else if (prev < 95) {
          setStatusMessage('Classificando categorias com IA...');
          return prev + 0.5;
        }
        return prev;
      });
    }, 150);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      let fileType: 'pdf' | 'text' = 'pdf';
      let fileData = '';

      if (extension === 'pdf') {
        fileType = 'pdf';
        // Convert PDF to Base64
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      } else if (['xlsx', 'xls'].includes(extension)) {
        fileType = 'text';
        // Extract Excel contents on the client using xlsx and format as text CSV
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              let textResult = '';
              workbook.SheetNames.forEach((sheetName) => {
                const worksheet = workbook.Sheets[sheetName];
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                textResult += `Aba: ${sheetName}\n${csv}\n\n`;
              });
              resolve(textResult);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = (err) => reject(err);
          reader.readAsArrayBuffer(file);
        });
      } else {
        // CSV, TXT, DOCX as raw text text-parsing
        fileType = 'text';
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsText(file);
        });
      }

      // API Request to backend proxy
      const response = await fetch('/api/importar-extrato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType, fileData })
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || 'Erro na resposta do servidor.');
      }

      const result = await response.json();
      const rawTxs = result.transactions || [];

      // Structure parsed items for review table
      const formattedTxs: ParsedTransaction[] = rawTxs.map((t: any, index: number) => ({
        id: String(index + Date.now()),
        date: t.date || new Date().toISOString().split('T')[0],
        title: t.title || 'Lançamento',
        type: t.type === 'entrada' ? 'entrada' : 'saida',
        amount: Math.abs(Number(t.amount)) || 0,
        paymentMethod: t.paymentMethod || 'Pix',
        category: t.category || 'Não identificada',
        confidence: Number(t.confidence) || 70,
        selected: true
      }));

      // Finish progress animation smoothly
      clearInterval(progressInterval);
      setProgress(100);
      setStatusMessage('Sucesso! Preparando para revisão.');

      setTimeout(() => {
        setTransactionsToReview(formattedTxs);
        setStep('review');
      }, 500);

    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('Error importing:', err);
      setErrorMsg(err.message || 'Houve um erro ao processar o extrato. Tente novamente.');
      setStep('upload');
    }
  };

  // Actions inside review step
  const handleToggleRowSelection = (id: string) => {
    setTransactionsToReview(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const handleToggleAllSelection = (checked: boolean) => {
    setTransactionsToReview(prev => prev.map(t => ({ ...t, selected: checked })));
  };

  const handleUpdateField = (id: string, field: keyof ParsedTransaction, value: any) => {
    setTransactionsToReview(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, [field]: value };
        // If they edit category manually, set confidence to 100%
        if (field === 'category') {
          updated.confidence = 100;
        }
        return updated;
      }
      return t;
    }));
  };

  const handleDeleteRow = (id: string) => {
    setTransactionsToReview(prev => prev.filter(t => t.id !== id));
  };

  const selectedCount = transactionsToReview.filter(t => t.selected).length;

  // Confirm final import
  const handleConfirmImport = async () => {
    const selectedTxs = transactionsToReview.filter(t => t.selected);
    if (selectedTxs.length === 0) return;

    let entradas = 0;
    let saidas = 0;
    let volume = 0;

    for (const tx of selectedTxs) {
      if (tx.type === 'entrada') {
        entradas++;
        volume += tx.amount;
      } else {
        saidas++;
        volume += tx.amount;
      }

      // Call dashboard action to add to DB/State
      await onAddTransaction({
        title: tx.title,
        amount: tx.amount,
        type: tx.type,
        date: tx.date,
        paymentMethod: tx.paymentMethod,
        category: tx.category === 'Não identificada' ? 'Outras despesas' : tx.category
      });
    }

    // Calculate time saved: ~30 seconds (0.5 min) per transaction
    const estimatedMinutes = Math.max(1, Math.round(selectedTxs.length * 0.5));

    setSummaryData({
      totalImported: selectedTxs.length,
      entradasCount: entradas,
      saidasCount: saidas,
      totalVolume: volume,
      timeSavedMinutes: estimatedMinutes
    });

    setStep('success');
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const getConfidenceBadgeColor = (conf: number, cat: string) => {
    if (cat === 'Não identificada') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (conf >= 85) return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (conf >= 60) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-[#121217] border border-white/5 rounded-3xl overflow-hidden shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)] flex flex-col my-8 max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-bold text-on-surface">Importação Inteligente</h3>
              <p className="text-xs text-on-surface-variant">Lançamento de extratos com inteligência artificial</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        {/* Inner Content scroll area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* STEP 1: UPLOAD AREA */}
          {step === 'upload' && (
            <div className="flex flex-col gap-6 text-left max-w-3xl mx-auto py-4">
              
              {/* Promo Banner if essential */}
              {!isPro && (
                <div className="bg-gradient-to-r from-primary/10 to-indigo-500/10 border border-primary/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">Upgrade para MCO PRO</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                      No plano Essencial você possui limite de 20 créditos mensais. No **PRO** você tem **50 créditos mensais**, e-mail marketing, inteligência avançada e relatórios expansivos.
                    </p>
                  </div>
                  <button 
                    onClick={onUpgradePlan}
                    className="shrink-0 bg-primary hover:bg-[#8455ef] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Fazer Upgrade
                  </button>
                </div>
              )}

              {/* Credits counter */}
              <div className="flex items-center justify-between px-2">
                <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  Seu limite de créditos mensais:
                </span>
                <span className="text-xs font-bold text-on-surface bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                  <span className="text-primary">{remainingCredits}</span> / {monthlyLimit} créditos restantes este mês <span className="text-[10px] text-on-surface-variant font-normal ml-1">(Consumo: 5 por importação)</span>
                </span>
              </div>

              {/* Error messages */}
              {errorMsg && (
                <div className="bg-error/10 border border-error/20 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-error leading-relaxed">{errorMsg}</p>
                </div>
              )}

              {/* DRAG AND DROP CONTAINER */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center transition-all flex flex-col items-center justify-center gap-4 cursor-pointer relative overflow-hidden group min-h-[260px] ${
                  isDragging 
                    ? 'border-primary bg-primary/5 scale-[0.99]' 
                    : 'border-white/10 hover:border-primary/50 hover:bg-white/[0.01]'
                }`}
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.csv,.txt,.docx"
                  onChange={handleFileSelect}
                />
                
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-primary/10 group-hover:border-primary/20">
                  <Upload className="w-7 h-7 text-on-surface-variant group-hover:text-primary transition-colors" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-bold text-on-surface">
                    {file ? file.name : 'Arraste seu extrato ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                    Formatos suportados: **PDF, XLSX, XLS, CSV, TXT ou DOCX** (até 15MB)
                  </p>
                </div>

                {file && (
                  <div className="mt-2 bg-primary/10 text-primary border border-primary/20 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Arquivo pronto para envio
                  </div>
                )}
              </div>

              {/* Supported details layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl mt-0.5">query_stats</span>
                  <div>
                    <h5 className="text-xs font-bold text-on-surface">Extração Multi-formato</h5>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                      Leia perfeitamente arquivos PDF nativos, planilhas geradas pelo Excel ou arquivos CSV puros dos bancos.
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl mt-0.5">auto_awesome</span>
                  <div>
                    <h5 className="text-xs font-bold text-on-surface">Categorização Automática</h5>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                      Nossa Inteligência Artificial tenta deduzir a categoria correta e calcula um indicador de confiança.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleStartImport}
                  disabled={!file}
                  className={`bg-primary hover:bg-[#8455ef] text-white font-bold text-xs py-3 px-6 rounded-xl flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(109,59,215,0.25)] hover:shadow-[0_6px_20px_rgba(109,59,215,0.4)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Sparkles className="w-4 h-4" />
                  Analisar Extrato com IA
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: PROCESSING SCREEN */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 text-center max-w-lg mx-auto gap-8">
              
              <div className="relative flex items-center justify-center">
                {/* Simulated radar pulse */}
                <div className="absolute w-24 h-24 bg-primary/20 rounded-full animate-ping pointer-events-none"></div>
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center relative z-10">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-lg font-bold text-on-surface">{statusMessage}</h4>
                <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
                  Isso pode levar alguns segundos. Nossa IA está estruturando e classificando suas movimentações.
                </p>
              </div>

              {/* Progress bar container */}
              <div className="w-full flex flex-col gap-2">
                <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${progress}%` }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.3 }}
                  ></motion.div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-on-surface-variant px-1">
                  <span>PROCESSANDO EXTRATO</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>

              {/* Dynamic steps logs checklist to increase premium feel */}
              <div className="w-full max-w-sm bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-left flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${progress >= 25 ? 'bg-green-500/10 text-green-400' : 'bg-primary/20 text-primary animate-pulse'}`}>
                    {progress >= 25 ? '✓' : '•'}
                  </div>
                  <span className={progress >= 25 ? 'text-on-surface-variant/50 line-through' : 'text-on-surface font-semibold'}>Lendo arquivo e decodificando...</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${progress >= 55 ? 'bg-green-500/10 text-green-400' : progress >= 25 ? 'bg-primary/20 text-primary animate-pulse' : 'bg-white/5 text-white/20'}`}>
                    {progress >= 55 ? '✓' : '•'}
                  </div>
                  <span className={progress >= 55 ? 'text-on-surface-variant/50 line-through' : progress >= 25 ? 'text-on-surface font-semibold' : 'text-white/20'}>Identificando lançamentos e valores...</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${progress >= 80 ? 'bg-green-500/10 text-green-400' : progress >= 55 ? 'bg-primary/20 text-primary animate-pulse' : 'bg-white/5 text-white/20'}`}>
                    {progress >= 80 ? '✓' : '•'}
                  </div>
                  <span className={progress >= 80 ? 'text-on-surface-variant/50 line-through' : progress >= 55 ? 'text-on-surface font-semibold' : 'text-white/20'}>Classificando categorias com IA...</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${progress >= 100 ? 'bg-green-500/10 text-green-400' : progress >= 80 ? 'bg-primary/20 text-primary animate-pulse' : 'bg-white/5 text-white/20'}`}>
                    {progress >= 100 ? '✓' : '•'}
                  </div>
                  <span className={progress >= 100 ? 'text-on-surface-variant/50 line-through' : progress >= 80 ? 'text-on-surface font-semibold' : 'text-white/20'}>Concluindo mapeamento e validações...</span>
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: LIMIT EXCEEDED */}
          {step === 'limit_exceeded' && (
            <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto gap-6 text-left">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xl font-bold text-on-surface">Limite Mensal Atingido!</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Você já atingiu seu limite mensal de créditos para importações inteligentes este mês. Seu saldo de créditos será renovado no próximo mês!
                </p>
              </div>

              <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-on-surface-variant">Seu Limite Atual</span>
                  <span className="font-bold text-on-surface">{monthlyLimit} créditos / mês ({isPro ? 'Plano PRO' : 'Plano Essencial'})</span>
                </div>
                {!isPro && (
                  <p className="text-[11px] text-primary font-medium leading-normal">
                    💡 Faça o upgrade para o **Plano PRO** agora mesmo e aumente seu limite para **50 créditos mensais**, além de desbloquear todos os gráficos de análise avançada do fluxo de caixa!
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-on-surface font-bold text-xs py-3.5 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                {!isPro && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onUpgradePlan) {
                        onUpgradePlan();
                      } else {
                        window.open(CHECKOUT_PRO_URL, '_blank');
                      }
                    }}
                    className="flex-1 bg-primary hover:bg-[#8455ef] text-white font-extrabold text-xs py-3.5 px-4 rounded-xl transition-all shadow-[0_4px_12px_rgba(109,59,215,0.25)] cursor-pointer"
                  >
                    Fazer Upgrade
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW SCREEN */}
          {step === 'review' && (
            <div className="flex flex-col gap-6 text-left">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-lg font-bold text-on-surface">Revisar Movimentações Extraídas</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Selecione, edite ou exclua lançamentos antes de importá-los para o seu caixa.
                  </p>
                </div>
                
                <div className="bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span className="text-on-surface-variant">Prontas para importar:</span>
                  <span className="font-bold text-on-surface">{selectedCount} de {transactionsToReview.length}</span>
                </div>
              </div>

              {/* Main table wrapper with overflow */}
              <div className="border border-white/5 rounded-2xl overflow-hidden bg-surface-container/10">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs text-left min-w-[800px]">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5 text-on-surface-variant font-bold">
                        <th className="py-3 px-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={transactionsToReview.length > 0 && transactionsToReview.every(t => t.selected)}
                            onChange={(e) => handleToggleAllSelection(e.target.checked)}
                            className="rounded border-white/10 text-primary focus:ring-primary w-4 h-4 cursor-pointer bg-white/5"
                          />
                        </th>
                        <th className="py-3 px-4 w-32">DATA</th>
                        <th className="py-3 px-4">DESCRIÇÃO / NOME DA TRANSAÇÃO</th>
                        <th className="py-3 px-4 w-28">TIPO</th>
                        <th className="py-3 px-4 w-32">VALOR (R$)</th>
                        <th className="py-3 px-4 w-44">CATEGORIA SUGERIDA</th>
                        <th className="py-3 px-4 w-36 text-center">CONFIANÇA IA</th>
                        <th className="py-3 px-4 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactionsToReview.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                            Nenhuma movimentação extraída ou válida no extrato.
                          </td>
                        </tr>
                      ) : (
                        transactionsToReview.map((tx) => (
                          <tr 
                            key={tx.id}
                            className={`hover:bg-white/[0.01] transition-colors ${!tx.selected ? 'opacity-50' : ''}`}
                          >
                            {/* Checkbox */}
                            <td className="py-2 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={tx.selected}
                                onChange={() => handleToggleRowSelection(tx.id)}
                                className="rounded border-white/10 text-primary focus:ring-primary w-4 h-4 cursor-pointer bg-white/5"
                              />
                            </td>
                            
                            {/* Date (Editable) */}
                            <td className="py-2 px-4">
                              <input
                                type="date"
                                value={tx.date}
                                onChange={(e) => handleUpdateField(tx.id, 'date', e.target.value)}
                                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-2 py-1.5 font-semibold text-on-surface"
                              />
                            </td>

                            {/* Description / Title (Editable) */}
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={tx.title}
                                onChange={(e) => handleUpdateField(tx.id, 'title', e.target.value)}
                                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-2 py-1.5 font-semibold text-on-surface"
                              />
                            </td>

                            {/* Type (Editable) */}
                            <td className="py-2 px-4">
                              <select
                                value={tx.type}
                                onChange={(e) => handleUpdateField(tx.id, 'type', e.target.value as any)}
                                className={`w-full bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 font-bold focus:border-primary focus:ring-1 focus:ring-primary ${
                                  tx.type === 'entrada' ? 'text-green-400' : 'text-red-400'
                                }`}
                              >
                                <option value="entrada" className="bg-[#121217] text-green-400 font-bold">Entrada</option>
                                <option value="saida" className="bg-[#121217] text-red-400 font-bold">Saída</option>
                              </select>
                            </td>

                            {/* Amount / Value (Editable) */}
                            <td className="py-2 px-4">
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-on-surface-variant font-medium text-[10px]">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={tx.amount || ''}
                                  onChange={(e) => handleUpdateField(tx.id, 'amount', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg pl-6 pr-2 py-1.5 font-semibold text-on-surface"
                                />
                              </div>
                            </td>

                            {/* Category (Editable selector) */}
                            <td className="py-2 px-4">
                              <select
                                value={tx.category}
                                onChange={(e) => handleUpdateField(tx.id, 'category', e.target.value)}
                                className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-2 py-1.5 font-semibold text-on-surface"
                              >
                                <option value="Não identificada" className="bg-[#121217] text-red-400">Não identificada</option>
                                <optgroup label="Entradas" className="bg-[#121217] text-on-surface-variant">
                                  {AVAILABLE_CATEGORIES.entrada.map(cat => (
                                    <option key={cat} value={cat} className="bg-[#121217] text-on-surface font-semibold">{cat}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Saídas" className="bg-[#121217] text-on-surface-variant">
                                  {AVAILABLE_CATEGORIES.saida.map(cat => (
                                    <option key={cat} value={cat} className="bg-[#121217] text-on-surface font-semibold">{cat}</option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>

                            {/* Confidence indicators */}
                            <td className="py-2 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getConfidenceBadgeColor(tx.confidence, tx.category)}`}>
                                {tx.category === 'Não identificada' ? 'N/A' : `${tx.confidence}%`}
                              </span>
                            </td>

                            {/* Trash Delete button */}
                            <td className="py-2 px-4 text-center">
                              <button
                                onClick={() => handleDeleteRow(tx.id)}
                                className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>

                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import summary alert */}
              <div className="bg-[#6d3bd7]/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5 animate-pulse" />
                <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                  💡 **Dica de Categoria**: Se houver dúvida ou o status de Confiança estiver amarelo, você pode clicar no campo Categoria para selecionar um grupo adequado manualmente ou refinar o nome da transação. As categorias não identificadas que forem salvas serão automaticamente lançadas em **Outras despesas** no sistema.
                </p>
              </div>

              {/* Confirm Actions row */}
              <div className="flex items-center justify-between gap-4 mt-2 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setTransactionsToReview([]);
                    setStep('upload');
                  }}
                  className="px-5 py-3 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer border border-white/5 rounded-xl bg-white/5"
                >
                  Voltar para Upload
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={selectedCount === 0}
                  className="bg-[#6d3bd7] hover:bg-[#8455ef] text-white font-extrabold text-xs py-3.5 px-6 rounded-xl flex items-center gap-1.5 transition-all shadow-[0_4px_14px_rgba(109,59,215,0.3)] hover:shadow-[0_6px_22px_rgba(109,59,215,0.5)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-primary/30"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Importar {selectedCount} movimentações
                </button>
              </div>

            </div>
          )}

          {/* STEP 5: SUCCESS SCREEN */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center max-w-lg mx-auto gap-8 text-left">
              
              <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xl font-bold text-on-surface">Importação Concluída com Sucesso!</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  As movimentações selecionadas foram processadas e injetadas no seu fluxo de caixa do MCO.
                </p>
              </div>

              {/* Summary Stats Panel */}
              <div className="w-full grid grid-cols-2 gap-4">
                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col gap-1 items-start text-left">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Lançamentos</span>
                  <span className="text-lg font-black text-on-surface">{summaryData.totalImported} movimentações</span>
                  <div className="flex gap-2 text-[10px] font-bold text-on-surface-variant/85 mt-1">
                    <span className="text-green-400">{summaryData.entradasCount} Entradas</span>
                    <span>•</span>
                    <span className="text-red-400">{summaryData.saidasCount} Saídas</span>
                  </div>
                </div>
                
                <div className="bg-[#6d3bd7]/5 border border-primary/10 rounded-2xl p-4 flex flex-col gap-1 items-start text-left relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full filter blur-md pointer-events-none"></div>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-pulse" /> Tempo Economizado
                  </span>
                  <span className="text-lg font-black text-on-surface">~ {summaryData.timeSavedMinutes} minutos</span>
                  <p className="text-[10px] text-on-surface-variant/85 leading-none mt-1">
                    Economizado pelo assistente inteligente de IA.
                  </p>
                </div>
              </div>

              {/* Financial Volume Total Info */}
              <div className="w-full bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex items-center justify-between text-left">
                <div>
                  <h5 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Volume Financeiro Movimentado</h5>
                  <p className="text-sm font-black text-on-surface mt-0.5">{formatBRL(summaryData.totalVolume)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg">payments</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full bg-primary hover:bg-[#8455ef] text-white font-extrabold text-sm py-4 rounded-xl transition-all shadow-[0_4px_12px_rgba(109,59,215,0.25)] cursor-pointer"
              >
                Tudo pronto para análise!
              </button>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
