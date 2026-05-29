import React, { useState, useRef, useEffect } from "react";
import { 
  Scale, FileText, UploadCloud, AlertTriangle, CheckCircle, 
  XCircle, Copy, Check, RotateCcw, FileDown, Search, Sparkles, 
  ChevronDown, ChevronUp, ShieldCheck, HelpCircle, FileCheck, 
  BookOpen, Info, ShieldAlert, ArrowRight, Printer
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { EXAMPLE_CONTRACTS } from "./examples";
import { ContractAnalysisResult, RiskClause, RiskLevel } from "./types";
import { parseContractReport } from "./utils/parser";

interface DangerTermScan {
  name: string;
  pattern: RegExp;
  description: string;
  mitigation: string;
  riskLevel: "Alto" | "Médio" | "Baixo";
  category: "Financeiro" | "Operacional" | "Responsabilidade" | "Saída";
}

const DANGER_TERMS: DangerTermScan[] = [
  // --- Financeiro ---
  {
    name: "Reajuste Automático",
    category: "Financeiro",
    pattern: /(reajuste\s+autom[áa]tico|reajustado\s+automaticamente|unilateralmente\s+reajustar|reajustada\s+unilateralmente)/i,
    description: "Permite reajustes de preços ou encargos financeiros de forma automática ou unilateral, sem renegociação prévia ou anuência escrita.",
    mitigation: "Exija que qualquer reajuste anual seja baseado em índice público estável (ex: IPCA) e avisado formalmente por escrito.",
    riskLevel: "Médio"
  },
  {
    name: "Repasse de Tributos",
    category: "Financeiro",
    pattern: /(repasse\s+de\s+tributos|repasse\s+de\s+impostos|transfer[êe]ncia\s+do\s+ônus\s+tribut[áa]rio|majorado\s+pelos\s+tributos)/i,
    description: "Transfere o risco de instituição de novos tributos ou aumento de alíquotas fiscais diretamente para você de forma direta.",
    mitigation: "Ajuste o repasse para que dependa de comprovação matemática do impacto real e seja renegociado formalmente via aditivo.",
    riskLevel: "Médio"
  },
  {
    name: "Despesas Reembolsáveis",
    category: "Financeiro",
    pattern: /(despesas\s+reembols[áa]veis|reembolso\s+de\s+despesa|custos\s+adicionais\s+reembolsados|reembolsará\s+as\s+despesas)/i,
    description: "Obriga ao reembolso de despesas geradas pela outra parte sem limites quantificáveis ou comprovação clara e rigorosa.",
    mitigation: "Sempre estipule um teto máximo de gastos mensais e exija pré-aprovação formal por e-mail para despesas extras.",
    riskLevel: "Médio"
  },
  {
    name: "Preço Estimado",
    category: "Financeiro",
    pattern: /(pre[çc]o\s+estimado|valor\s+estimado|faturamento\s+por\s+estimativa|previs[ãa]o\s+de\s+pre[çc]o)/i,
    description: "Indica ausência de teto financeiro fechado ou escopo fixo, expondo o contratante a cobranças imprevistas de infraestrutura.",
    mitigation: "Pactue preço sob escopo fechado e defina que qualquer valor extra necessita de aditivo de re-estimativa assinado por ambos.",
    riskLevel: "Médio"
  },

  // --- Operacional ---
  {
    name: "Aceite Tácito",
    category: "Operacional",
    pattern: /(aceite\s+t[áa]cito|aceite\s+presumido|aprova[çc][ãa]o\s+silenciosa|sil[êe]ncio\s+como\s+aceite)/i,
    description: "O silêncio ou falta de contestação num prazo curto e rígido gera aprovação automática do serviço entregue ou da cobrança.",
    mitigation: "Exclua o aceite presumido e exija que qualquer entrega requeira aceite formal assinado (Termo de Recebimento Definitivo).",
    riskLevel: "Alto"
  },
  {
    name: "Melhores Esforços",
    category: "Operacional",
    pattern: /(melhores\s+esfor[çc]os|envidar\s+(\w+\s+)?esfor[çc]os|envidar[áa]\s+seus\s+esfor[çc]os)/i,
    description: "Substitui obrigações de resultado reais por obrigações simples de meios, reduzindo a responsabilidade por falhas de entrega.",
    mitigation: "Exija metas objetivas mensuráveis, cronogramas fixos, patamares mínimos de SLA e penalidades por descumprimento habitual.",
    riskLevel: "Médio"
  },
  {
    name: "Escopo Aberto",
    category: "Operacional",
    pattern: /(escopo\s+aberto|atividades\s+adicionais|demanda\s+flex[íi]vel|desenvolvimento\s+sob\s+demanda\s+geral)/i,
    description: "Cláusulas indefinidas que abrem brechas para alteração ou acréscimo unilateral de demandas sem novos orçamentos.",
    mitigation: "Exclua ambiguities definindo anexos descritivos fechados. Qualquer escopo novo deve vir por matriz de aditivo comercial.",
    riskLevel: "Alto"
  },
  {
    name: "Suprimento de Terceiros",
    category: "Operacional",
    pattern: /(suprimento\s+de\s+terceiros|fornecedores\s+subcontratados|isen[çc][ãa]o\s+por\s+terceirizados|terceiros\s+intervenientes)/i,
    description: "A outra parte se isenta de responsabilidades contratuais em relação a atrasos causados por suas próprias subcontratadas.",
    mitigation: "Garanta a cláusula de responsabilidade solidária/integral do fornecedor principal pelas falhas de qualquer parceiro adjacente.",
    riskLevel: "Alto"
  },

  // --- Responsabilidade ---
  {
    name: "Responsabilidade Solidária",
    category: "Responsabilidade",
    pattern: /responsabilidade\s+solid[áa]ria/i,
    description: "Vínculo de obrigação indivisível que lhe faz sofrer o dever de indenizar mesmo por falhas de terceiros/subparceiros.",
    mitigation: "Substitua por responsabilidade subsidiária ou limite os danos a atos dolosos diretos próprios.",
    riskLevel: "Alto"
  },
  {
    name: "Renúncia de Indenização",
    category: "Responsabilidade",
    pattern: /(ren[úu]ncia\s+de\s+indeniza[çc][ãa]o|abrir\s+m[ãa]o\s+de\s+indenizar|isen[çc][ãa]o\s+plena\s+de\s+danos|renuncia\s+ao\s+direito\s+de\s+repara[çc][ãa]o)/i,
    description: "Renúncia absoluta do direito de pleitear indenizações, perdas e danos legítimos decorrentes de violações ou falha grave.",
    mitigation: "Exclua renúncias automáticas e gerais. Restrinja a indenizações normais de perdas e danos diretos devidamente comprovados.",
    riskLevel: "Alto"
  },
  {
    name: "Indenização Ilimitada",
    category: "Responsabilidade",
    pattern: /(indeniza[çc][ãa]o\s+ilimitada|responsabilidade\s+ilimitada|sem\s+limite\s+de\s+indeniza[çc][ãa]o|responder[áa]\s+integralmente\s+sem\s+limites)/i,
    description: "Dever de indenizar sem qualquer limitação financeira máxima (Cap), expondo a empresa a multas e condenações catastróficas.",
    mitigation: "Institua um teto de indenização (Cap de Responsabilidade) referenciado no valor dos últimos 12 meses faturados no contrato.",
    riskLevel: "Alto"
  },
  {
    name: "Lucros Cessantes",
    category: "Responsabilidade",
    pattern: /lucros\s+cessantes/i,
    description: "Obriga indenizar faturamento, estimativas de ganhos futuros e lucros perdidos pela contraparte em virtude do encerramento ou descumprimento.",
    mitigation: "Sempre exclua de forma mútua danos indiretos, lucros cessantes e danos morais, fixando um limite financeiro máximo.",
    riskLevel: "Alto"
  },

  // --- Saída ---
  {
    name: "Renovação Automática",
    category: "Saída",
    pattern: /(renova[çc][ãa]o\s+autom[áa]tica|prorroga[çc][ãa]o\s+autom[áa]tica)/i,
    description: "O contrato é renovado indefinidamente caso você não manifeste a intenção de rescindir dentro de um prazo estrito e predeterminado.",
    mitigation: "Exija notificação prévia expressa e reduza penalidades de rescisão antecipada.",
    riskLevel: "Médio"
  },
  {
    name: "Multa Rescisória",
    category: "Saída",
    pattern: /(multa\s+(rescis[óo]ria|excessiva)|multa\s+por\s+rescis[ãa]o|penalidade\s+rescis[óo]ria)/i,
    description: "Multas penais por rescisão ou descumprimentos leves que excedem os limites comerciais saudáveis de mercado.",
    mitigation: "Renegocie para limitar multas rescisórias ao máximo razoável de 10% a 20% do saldo residual das parcelas vigentes.",
    riskLevel: "Alto"
  },
  {
    name: "Rescisão Unilateral",
    category: "Saída",
    pattern: /(rescis[ãa]o\s+unilateral|rescis[ãa]o\s+por\s+conveni[êe]ncia|den[úu]ncia\s+vazia|direito\s+de\s+rescis[ãa]o|notifica[çc][ãa]o\s+de\s+cancelamento|prazo\s+de\s+aviso\s+pr[ée]vio|prazo\s+de\s+notifica[çc][ãa]o)/i,
    description: "Multas ou penalidades abusivas para o encerramento unilateral por conveniência do Contratante, ou exigência de prazo de notificação de cancelamento desproporcional.",
    mitigation: "Garanta que a rescisão imotivada pelo Contratante exija apenas restituição de custos diretos comprovadamente incorridos e aviso prévio razoável (30 dias) sem multas compensatórias abusivas.",
    riskLevel: "Alto"
  },
  {
    name: "Vencimento Antecipado",
    category: "Saída",
    pattern: /(vencimento\s+antecipado|vencer[áa]\s+antecipadamente|vencimento\s+de\s+pleno\s+direito|exigibilidade\s+antecipada)/i,
    description: "Ocorrência que faz com que toda a dívida ou parcelas vincendas do contrato vençam de imediato por descumprimento leve.",
    mitigation: "Exija notificação prévia de cura de no mínimo 30 dias para regularizar a pendência antes do vencimento antecipado das obrigações.",
    riskLevel: "Alto"
  },
  {
    name: "Foro de Eleição",
    category: "Saída",
    pattern: /foro\s+de\s+elei[çc][ãa]o/i,
    description: "Limita qualquer contestação judicial ou arbitragem a uma comarca geograficamente distante e desfavorável para sua defesa.",
    mitigation: "Insira foro neutro (capitais estaduais) ou o de sede da parte contratualmente aderente/vulnerável.",
    riskLevel: "Médio"
  }
];

export default function App() {
  // Input states
  const [contractText, setContractText] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [analysisProfile, setAnalysisProfile] = useState<string>("completo");
  const [customFocus, setCustomFocus] = useState<string>("");
  
  // File states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [showExtractedText, setShowExtractedText] = useState<boolean>(false);

  // Loading & process states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Output states
  const [analysis, setAnalysis] = useState<ContractAnalysisResult | null>(null);
  const [leftViewMode, setLeftViewMode] = useState<"editor" | "reader">("editor");
  const [activeTab, setActiveTab] = useState<"executive" | "markdown" | "blindagem">("executive");
  const [riskFilter, setRiskFilter] = useState<"all" | "Alto" | "Médio" | "Baixo">("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [expandedClauseId, setExpandedClauseId] = useState<string | null>(null);

  // Copied indicator states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedFull, setCopiedFull] = useState<boolean>(false);

  // Selected scan term state for occurrences display
  const [selectedScanTerm, setSelectedScanTerm] = useState<string | null>(null);

  // Real-time danger terms scan results
  const scanResults = React.useMemo(() => {
    if (!contractText || contractText.trim().length === 0) {
      return DANGER_TERMS.map(term => ({ ...term, count: 0, matches: [] as string[] }));
    }
    return DANGER_TERMS.map(term => {
      const matches: string[] = [];
      const regex = new RegExp(term.pattern.source, "gi"); // ensure global flag for counting
      let match;
      
      // Let's protect against infinite loops with regex
      let safetyCounter = 0;
      while ((match = regex.exec(contractText)) !== null && safetyCounter < 100) {
        safetyCounter++;
        // To grab some local context, we can find the paragraph/sentence
        const start = Math.max(0, match.index - 45);
        const end = Math.min(contractText.length, match.index + match[0].length + 45);
        const textSnippet = "..." + contractText.slice(start, end).replace(/\s+/g, " ").trim() + "...";
        matches.push(textSnippet);
      }
      return {
        ...term,
        count: matches.length,
        matches
      };
    });
  }, [contractText]);

  // Maps each danger expression term name to the analyzed risk clauses containing it
  const clausesMatchingTerm = React.useMemo(() => {
    if (!analysis || !analysis.clauses) return {};
    const mapping: { [key: string]: typeof analysis.clauses } = {};
    
    DANGER_TERMS.forEach(term => {
      const matchedClauses = analysis.clauses.filter(clause => {
        const regex = new RegExp(term.pattern.source, "i");
        return (
          regex.test(clause.originalClause || "") || 
          regex.test(clause.title || "") ||
          regex.test(clause.dangerExplanation || "")
        );
      });
      mapping[term.name] = matchedClauses;
    });
    return mapping;
  }, [analysis]);

  // Slices contractText into styled parts with mapped clauses for rich inline-highlights
  const highlightedSegments = React.useMemo(() => {
    if (!contractText) return [];
    if (!analysis || !analysis.clauses || analysis.clauses.length === 0) {
      return [{ text: contractText, isHighlighted: false }];
    }

    const clauses = analysis.clauses;
    const matches: { start: number; end: number; clause: typeof clauses[0] }[] = [];

    clauses.forEach((clause) => {
      if (!clause.originalClause || clause.originalClause.trim().length === 0) return;

      // Try direct match first
      let index = contractText.indexOf(clause.originalClause);

      // Looser fallback: match first 40 chars
      if (index === -1) {
        const queryPart = clause.originalClause.trim().slice(0, 40);
        if (queryPart.length >= 10) {
          index = contractText.indexOf(queryPart);
        }
      }

      if (index !== -1) {
        const matchedStr = contractText.slice(index, index + clause.originalClause.length);
        const actualLen = matchedStr.length > 0 ? matchedStr.length : clause.originalClause.length;
        matches.push({
          start: index,
          end: index + actualLen,
          clause,
        });
      }
    });

    // Sort by start position
    matches.sort((a, b) => a.start - b.start);

    // Filter overlapping positions
    const nonOverlapping: typeof matches = [];
    let lastEnd = 0;
    for (const match of matches) {
      if (match.start >= lastEnd) {
        nonOverlapping.push(match);
        lastEnd = match.end;
      }
    }

    // Build segment array
    const segments: { text: string; isHighlighted: boolean; clause?: typeof clauses[0] }[] = [];
    let cursor = 0;
    for (const m of nonOverlapping) {
      if (m.start > cursor) {
        segments.push({
          text: contractText.slice(cursor, m.start),
          isHighlighted: false,
        });
      }
      segments.push({
        text: contractText.slice(m.start, m.end),
        isHighlighted: true,
        clause: m.clause,
      });
      cursor = m.end;
    }
    if (cursor < contractText.length) {
      segments.push({
        text: contractText.slice(cursor),
        isHighlighted: false,
      });
    }

    return segments;
  }, [contractText, analysis]);

  // Check backend server status on mount
  useEffect(() => {
    fetch("/api/health")
      .then(res => res.json())
      .then(data => {
        if (!data.geminiConfigured) {
          setStatusMessage({
            type: "info",
            text: "Servidor ativo! Lembre-se de configurar a sua 'GEMINI_API_KEY' nas configurações seSecrets para realizar a análise inteligente."
          });
        }
      })
      .catch(() => {
        setStatusMessage({
          type: "error",
          text: "Servidor offline ou inicializando. Por favor, aguarde alguns instantes."
        });
      });
  }, []);

  // Set timeout for copy feedback
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyFullReport = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis.rawMarkdown);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      await processUploadedFile(droppedFile);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      await processUploadedFile(selectedFile);
    }
  };

  // Common file text extraction fetch
  const processUploadedFile = async (file: File) => {
    setIsLoading(true);
    setLoadingStep("Lendo arquivo e extraindo texto...");
    setStatusMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Erro ao ler o documento.";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = `Erro de conexão ou falha no servidor (Status ${response.status}: ${response.statusText || "Não Identificado"}).`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setContractText(data.text);
      setFilename(data.filename);
      setFileSize(file.size);
      setShowExtractedText(false);
      setStatusMessage({
        type: "success",
        text: `Arquivo '${data.filename}' lido com sucesso! Iniciando scanner em tempo real e auditoria profunda...`
      });

      // Auto-trigger the deep 360º audit immediately on upload (Reativade)
      await runAnalysisWithText(data.text);
    } catch (err: any) {
      setIsLoading(false);
      setLoadingStep("");
      setStatusMessage({
        type: "error",
        text: err.message || "Erro de upload de arquivo. Verifique o tamanho e formato (.pdf, .docx, .txt)."
      });
    }
  };

  // Submit text for analysis (Core 360º Master Prompt runner)
  const runAnalysisWithText = async (textToAnalyze: string) => {
    if (!textToAnalyze || textToAnalyze.trim().length < 40) {
      setStatusMessage({
        type: "error",
        text: "Por favor, insira ou carregue um texto de contrato com tamanho válido para analisar (mínimo 40 caracteres)."
      });
      return;
    }

    setIsLoading(true);
    setLoadingStep("Conectando ao modelo jurídico do Gemini...");
    setStatusMessage(null);

    // Simulated staggered loading steps for a highly polished experience
    const steps = [
      "Processando estrutura contratual...",
      "Identificando cláusulas de lucros cessantes e limites indenitários...",
      "Avaliando riscos de prazos, multas e penalidades comerciais...",
      "Simulando propostas de blindagem jurídica balanceada...",
      "Formatando relatório final em markdown com veredito..."
    ];

    let currentStepIndex = 0;
    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        setLoadingStep(steps[currentStepIndex]);
        currentStepIndex++;
      }
    }, 2800);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToAnalyze,
          analysisProfile,
          customFocus
        }),
      });

      if (!response.ok) {
        let errorMessage = "Erro de análise da IA.";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = `Erro de conexão ou falha no servidor (Status ${response.status}: ${response.statusText || "Não Identificado"}).`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      clearInterval(interval);
      setLoadingStep("Finalizando auditoria...");
      
      const parsedResults = parseContractReport(data.result);
      setAnalysis(parsedResults);
      setExpandedClauseId(parsedResults.clauses[0]?.id || null);
      setLeftViewMode("reader");
      
      setStatusMessage({
        type: "success",
        text: `Auditoria concluída com sucesso! Saúde global do documento: ${parsedResults.healthScore}/100.`
      });
    } catch (err: any) {
      clearInterval(interval);
      setStatusMessage({
        type: "error",
        text: err.message || "Falha na análise. Verifique se o servidor backend está online e se a chave de API está definida."
      });
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  // Manual Trigger handler
  const handleAnalyze = async () => {
    await runAnalysisWithText(contractText);
  };

  // Load an example contract
  const handleLoadExample = async (exampleIndex: number) => {
    const example = EXAMPLE_CONTRACTS[exampleIndex];
    setContractText(example.text);
    setFilename(example.filename);
    setFileSize(null);
    setShowExtractedText(true);
    setAnalysisProfile(example.profile);
    setCustomFocus("");
    setAnalysis(null);
    setStatusMessage({
      type: "success",
      text: `Exemplo '${example.title}' carregado! Iniciando auditoria e scanner automático...`
    });

    // Auto-trigger analysis for seamless UX matching actual upload
    await runAnalysisWithText(example.text);
  };

  // Clear everything
  const handleClear = () => {
    setContractText("");
    setFilename("");
    setFileSize(null);
    setShowExtractedText(true);
    setCustomFocus("");
    setAnalysis(null);
    setLeftViewMode("editor");
    setStatusMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Trigger file selection dialog
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Helper for formatting file size bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Download analysis as Word (.doc) under strict ABNT standards
  const handleDownloadWordABNT = () => {
    if (!analysis) return;

    const docTitle = filename ? filename.replace(/\.[^/.]+$/, "") : "Contrato";
    const year = new Date().getFullYear();

    let clausesHtml = "";
    if (analysis.clauses && analysis.clauses.length > 0) {
      analysis.clauses.forEach((clause, index) => {
        const rColor = clause.riskLevel === "Alto" ? "#b91c1c" : clause.riskLevel === "Médio" ? "#b45309" : "#451a03";
        clausesHtml += `
          <div style="margin-bottom: 24pt; page-break-inside: avoid;">
            <h2 style="font-size: 12pt; font-family: Arial, sans-serif; font-weight: bold; text-transform: none; text-align: left; margin: 18pt 0 6pt 0; text-indent: 0;">
              3.${index + 1} Cláusula: ${escapeHtml(clause.title)} (<span style="color: ${rColor};">Risco ${escapeHtml(clause.riskLevel)}</span>)
            </h2>
            <p style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; text-indent: 1.25cm; text-align: justify; margin: 0 0 12pt 0;">
              <strong>Texto Original Analisado:</strong> <span style="font-style: italic; background-color: #f9fafb;">"${escapeHtml(clause.originalClause)}"</span>
            </p>
            <p style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; text-indent: 1.25cm; text-align: justify; margin: 0 0 12pt 0;">
              <strong>Explicação do Risco:</strong> ${escapeHtml(clause.dangerExplanation)}
            </p>
            <p style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; text-indent: 1.25cm; text-align: justify; margin: 0 0 12pt 0;">
              <strong>Resumo do Problema Principal:</strong> ${escapeHtml(clause.coreIssueSummary || "Ponto crítico na distribuição de responsabilidade.")}
            </p>
            <p style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; text-indent: 1.25cm; text-align: justify; margin: 0 0 12pt 0;">
              <strong>Reticulações / Vínculos:</strong> ${escapeHtml(clause.relations || "Nenhuma relação direta detectada.")}
            </p>
            <p style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; text-indent: 1.25cm; text-align: justify; margin: 0 0 12pt 0;">
              <strong>Diretriz Corretiva de Blindagem:</strong> ${escapeHtml(clause.recommendedAction)}
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 8pt;">
              <tr>
                <td style="border: 1px dashed #94a3b8; background-color: #fafaf9; padding: 10pt; font-family: 'Courier New', monospace; font-size: 10.5pt; color: #1e293b; text-align: justify; text-indent: 0;">
                  <strong style="font-family: Arial, sans-serif; font-size: 11pt; color: #44403c;">Minuta de Redação Proposta (Retificação Blindada):</strong><br/>
                  <span style="display: block; margin-top: 6pt; font-style: normal; line-height: 1.4;">${escapeHtml(clause.suggestedDraft || "Reescrever para garantir equidade entre contratante e contratado.")}</span>
                </td>
              </tr>
            </table>
          </div>
        `;
      });
    } else {
      clausesHtml = `<p style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; text-indent: 1.25cm; text-align: justify; margin: 0 0 12pt 0;">Nenhuma cláusula de risco crítico mapeada.</p>`;
    }

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Relatório de Blindagem e Auditoria de Contratos</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 21cm 29.7cm; /* A4 size */
            margin-top: 3.0cm;
            margin-bottom: 2.0cm;
            margin-left: 3.0cm;
            margin-right: 2.0cm;
          }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 12pt;
            color: #000000;
            line-height: 1.5;
            text-align: justify;
          }
          h1 {
            font-family: 'Arial', sans-serif;
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            text-align: left;
            margin: 24pt 0 12pt 0;
            text-indent: 0;
            page-break-before: always;
          }
          h1.first-intro {
            page-break-before: avoid;
          }
          h2 {
            font-family: 'Arial', sans-serif;
            font-size: 12pt;
            font-weight: bold;
            text-transform: none;
            text-align: left;
            margin: 18pt 0 6pt 0;
            text-indent: 0;
          }
          p {
            font-family: 'Arial', sans-serif;
            font-size: 12pt;
            line-height: 1.5;
            text-indent: 1.25cm;
            margin: 0 0 12pt 0;
            text-align: justify;
          }
        </style>
      </head>
      <body>
        <!-- CAPA PADRÃO ABNT -->
        <div style="margin-bottom: 120px; text-align: center;">
          <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-bottom: 150px; text-align: center;">
            SISTEMA INTEGRADO DE AUDITORIA E BLINDAGEM DE CONTRATOS
          </div>
          
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; line-height: 1.3; text-align: center; margin-bottom: 6px;">
              RELATÓRIO DE AUDITORIA DE RISCOS E RECOMENDAÇÕES DE BLINDAGEM
            </div>
            <div style="font-size: 12pt; font-style: italic; text-align: center; color: #4b5563;">
              Análise de Conformidade Jurídica e Minutas Propostas
            </div>
          </div>

          <div style="margin-left: 7cm; margin-top: 100px; margin-bottom: 150px; font-size: 10.5pt; text-align: justify; line-height: 1.3; border-left: 2px solid #000000; padding-left: 15px; text-indent: 0;">
            <strong>Foco Técnico do Instrumento:</strong> Relatório descritivo contendo as vulnerabilidades, assimetrias comerciais e gatilhos contratuais identificados no documento de contrato "${escapeHtml(docTitle)}", nos termos dos pilares de proteção jurídica preventiva sob rigor da norma técnica ABNT NBR 14724.
          </div>

          <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 150px; text-align: center;">
            BRASIL<br>
            ${year}
          </div>
        </div>

        <div style="page-break-after: always; mso-break-type: section-break-next-page;"></div>

        <!-- SEÇÃO 1: INTRODUÇÃO (ABNT 1) -->
        <h1 class="first-intro">1. INTRODUÇÃO</h1>
        <p>
          Este parecer de auditoria foi gerado de forma estruturada para apresentar o mapeamento sistemático de passivos ocultos e riscos contratuais. O objetivo precípuo é neutralizar assimetrias entre deveres, delimitar as salvaguardas em parcerias comerciais e assegurar absoluta reciprocidade técnica das partes sob a vigência do instrumento jurídico referenciado.
        </p>
        <p>
          A análise de auditoria de blindagem ponderou o equilíbrio financeiro do negócio através do escaneamento lexical e conceitual de termos de periculosidade operacional, mitigando assim litígios jurídicos e multas desmedidas.
        </p>

        <!-- SEÇÃO 2: DIAGNÓSTICO JURÍDICO E VEREDITO (ABNT 2) -->
        <h1>2. DIAGNÓSTICO JURÍDICO E VEREDITO</h1>
        <p>
          Em resposta ao processamento computacional inteligente, o documento de suporte obteve índice de saúde contratual global de <strong>${analysis.healthScore}/100</strong>.
        </p>
        <p>
          O veredicto atribuído pela banca analítica de blindagem contratual para este instrumento é: <strong>${escapeHtml(analysis.verdict.toUpperCase())}</strong>.
        </p>
        <p>
          <strong>Justificativa e Análise de Conformidade:</strong>
        </p>
        <p style="text-indent: 1.25cm; margin-bottom: 12pt;">
          ${escapeHtml(analysis.verdictDescription)}
        </p>

        <!-- SEÇÃO 3: DETALHAMENTO DE RISCOS E MINUTAS CORRETIVAS (ABNT 3) -->
        <h1>3. DETALHAMENTO DE RISCOS E MINUTAS CORRETIVAS</h1>
        <p>
          Abaixo encontram-se especificadas as disposições particulares que possuem passivos jurídicos e desalinhamento operacional ativo, contendo soluções preventivas sob regras de blindagem e minutas propostas para aditivos:
        </p>
        ${clausesHtml}

        <!-- SEÇÃO 4: METODOLOGIA E CONCLUSÃO (ABNT 4) -->
        <h1>4. METODOLOGIA E CONCLUSÃO</h1>
        <p>
          As recomendações deste relatório amparam-se na distribuição equânime de responsabilidade civil. Recomenda-se a adoção imediata das minutas técnicas contidas no item 3 para retificação de cada cláusula impugnada, visando o fortalecimento das defesas patrimoniais.
        </p>
        <p style="text-align: right; margin-top: 60px; font-weight: bold; text-indent: 0;">
          Relatório de Auditoria Preventiva de Contratos - Padrões ABNT NBR 14724
        </p>
      </body>
      </html>
    `;

    const file = new Blob([htmlContent], { type: "application/msword;charset=utf-8" });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    element.download = `Relatorio_ABNT_Blindagem_${docTitle.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Safe innerHTML utilities
  const escapeHtml = (text: string) => {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };


  // Helper for rendering badges
  const getRiskBadgeStyles = (level: RiskLevel) => {
    switch (level) {
      case "Alto":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "Médio":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "Baixo":
        return "bg-amber-500/10 text-amber-200 border-amber-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getVerdictStyles = (verdict: string) => {
    switch (verdict) {
      case "Aprovar":
        return {
          bg: "bg-amber-500/10 border-amber-500/20",
          text: "text-amber-350",
          icon: <CheckCircle className="w-5 h-5 text-amber-400" />,
          colorLabel: "Aprovar (Saudável)"
        };
      case "Aprovar com Ressalvas":
        return {
          bg: "bg-amber-500/10 border-amber-500/20",
          text: "text-amber-300",
          icon: <AlertTriangle className="w-5 h-5 text-amber-300" />,
          colorLabel: "Aprovar com Ressalvas"
        };
      case "Rejeitar e Renegociar":
        return {
          bg: "bg-rose-500/10 border-rose-500/20",
          text: "text-rose-400",
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
          colorLabel: "Rejeitar e Renegociar"
        };
      default:
        return {
          bg: "bg-slate-800 border-slate-700",
          text: "text-slate-300",
          icon: <HelpCircle className="w-5 h-5 text-slate-400" />,
          colorLabel: "Desconhecido"
        };
    }
  };

  // Filter clauses based on Search Term and Risk Level Filter
  const filteredClauses = analysis?.clauses.filter(c => {
    const matchesRisk = riskFilter === "all" || c.riskLevel === riskFilter;
    const matchesSearch = 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.dangerExplanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.originalClause.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.suggestedDraft.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.coreIssueSummary && c.coreIssueSummary.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesRisk && matchesSearch;
  }) || [];

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-100 md:py-8 py-4 bg-radial-at-t from-[#201705] via-[#050505] to-black relative overflow-hidden">
      
      {/* Background Watermark (SVG representation of the requested Scales of Justice & Laurel Globe symbol) */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-[0.06] md:opacity-[0.08]">
        <svg 
          viewBox="0 0 800 800" 
          className="w-[95vw] h-[95vw] max-w-[850px] max-h-[850px] text-amber-500 fill-none stroke-current"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Globe Grid Lines */}
          <circle cx="400" cy="400" r="280" strokeDasharray="1 1" />
          <circle cx="400" cy="400" r="280" />
          <path d="M400,120 Q480,400 400,680" strokeDasharray="4 4" />
          <path d="M400,120 Q320,400 400,680" strokeDasharray="4 4" />
          <path d="M120,400 Q400,480 680,400" strokeDasharray="4 4" />
          <path d="M120,400 Q400,320 680,400" strokeDasharray="4 4" />
          <line x1="120" y1="400" x2="680" y2="400" />
          <line x1="400" y1="120" x2="400" y2="680" />
          
          {/* Scales of Justice */}
          {/* Pillar base */}
          <path d="M340,560 L460,560 M350,540 L450,540 M365,520 L435,520" strokeWidth="2.5" />
          <rect x="390" y="280" width="20" height="240" rx="3" strokeWidth="2.5" />
          
          {/* Central top decoration */}
          <circle cx="400" cy="270" r="14" strokeWidth="2.5" />
          <path d="M400,240 L400,256" strokeWidth="2.5" />
          
          {/* Crossbeam */}
          <path d="M260,296 Q400,270 540,296" strokeWidth="4.5" />
          <circle cx="400" cy="285" r="6" fill="currentColor" />
          
          {/* Left Pan suspended */}
          <circle cx="260" cy="296" r="4.5" fill="currentColor" />
          <path d="M260,296 L210,430 M260,296 L310,430" strokeWidth="1.5" />
          <path d="M200,430 L320,430 Q260,490 200,430" strokeWidth="2.5" fill="currentColor" fillOpacity="0.1" />
          
          {/* Right Pan suspended */}
          <circle cx="540" cy="296" r="4.5" fill="currentColor" />
          <path d="M540,296 L490,430 M540,296 L590,430" strokeWidth="1.5" />
          <path d="M480,430 L600,430 Q540,490 480,430" strokeWidth="2.5" fill="currentColor" fillOpacity="0.1" />
          
          {/* Laurel Wreath */}
          {/* Left Branch */}
          <path d="M180,500 C150,420 180,280 250,225" strokeWidth="2.5" />
          {/* Left Leaves */}
          <path d="M180,500 Q155,485 165,470 Q180,480 180,500" fill="currentColor" />
          <path d="M165,460 Q140,445 150,430 Q168,440 165,460" fill="currentColor" />
          <path d="M158,415 Q135,395 148,380 Q163,392 158,415" fill="currentColor" />
          <path d="M157,365 Q138,340 153,328 Q166,345 157,365" fill="currentColor" />
          <path d="M164,315 Q150,290 167,280 Q177,298 164,315" fill="currentColor" />
          <path d="M178,270 Q168,242 187,235 Q193,258 178,270" fill="currentColor" />
          <path d="M200,235 Q195,208 213,205 Q217,228 200,235" fill="currentColor" />
          <path d="M228,210 Q228,182 245,185 Q245,208 228,210" fill="currentColor" />

          {/* Right Branch */}
          <path d="M620,500 C650,420 620,280 550,225" strokeWidth="2.5" />
          {/* Right Leaves */}
          <path d="M620,500 Q645,485 635,470 Q620,480 620,500" fill="currentColor" />
          <path d="M635,460 Q660,445 650,430 Q632,440 635,460" fill="currentColor" />
          <path d="M642,415 Q665,395 652,380 Q637,392 642,415" fill="currentColor" />
          <path d="M643,365 Q662,340 647,328 Q634,345 643,365" fill="currentColor" />
          <path d="M636,315 Q650,290 633,280 Q623,298 636,315" fill="currentColor" />
          <path d="M622,270 Q632,242 613,235 Q607,258 622,270" fill="currentColor" />
          <path d="M600,235 Q605,208 587,205 Q583,228 600,235" fill="currentColor" />
          <path d="M572,210 Q572,182 555,185 Q555,208 572,210" fill="currentColor" />

          {/* Anchor bow connecting branches below the pillar */}
          <path d="M380,590 Q400,610 420,590" strokeWidth="2" />
          <path d="M380,590 Q340,560 300,540 M420,590 Q460,560 500,540" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 relative z-10">
        
        {/* Banner/Header */}
        <header className="mb-8 border-b border-neutral-900 pb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute -bottom-10 left-10 w-48 h-48 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-950/80 text-amber-400 border border-amber-500/30 flex items-center justify-center rounded-xl shadow-lg shadow-amber-500/5 shrink-0">
                <Scale className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-amber-300 bg-amber-950 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-mono">
                    Legal AI Assistant
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-amber-450">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                    <span className="text-amber-400">Gemini 3.5 Active</span>
                  </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-amber-100 mt-1 flex items-center gap-2">
                  ⚖️ Análise de Contrato
                </h1>
              </div>
            </div>
          </div>
          <p className="text-neutral-400 mt-3.5 max-w-4xl leading-relaxed text-sm">
            Faça o upload do seu contrato e farei uma auditoria completa contra riscos de SLA, Propriedade Intelectual, NDAs e Penalidades.
          </p>
        </header>

        {/* Global Notifications system */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl border mb-6 flex items-start gap-3 text-sm shadow-lg ${
                statusMessage.type === "success" 
                  ? "bg-amber-950/60 text-amber-200 border-amber-800/60" 
                  : statusMessage.type === "error"
                  ? "bg-rose-950/60 text-rose-300 border-rose-800/60"
                  : "bg-amber-950/60 text-amber-300 border-amber-800/60"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {statusMessage.type === "success" && <CheckCircle className="w-4 h-4 text-amber-400" />}
                {statusMessage.type === "error" && <XCircle className="w-4 h-4 text-rose-400" />}
                {statusMessage.type === "info" && <Info className="w-4 h-4 text-amber-400" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-[13px]">{statusMessage.text}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-slate-200 font-mono text-xs cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/5"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel - Configurations & Document Upload */}
          <section className="lg:col-span-5 flex flex-col gap-6" id="input-section">
            
            {/* 1. SEÇÃO ESPECÍFICA DESTINADA PARA ANEXAR ARQUIVO DE CONTRATO (Requisitado) */}
            <div className="bg-slate-900/40 border border-slate-800/90 rounded-2xl shadow-xl p-5 backdrop-blur-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-300"></div>
              
              <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2 mb-2.5 pb-2.5 border-b border-slate-800/80">
                <UploadCloud className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                Anexar Arquivo do Contrato
              </h2>
              
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Faça o carregamento do documento original nos formatos suportados para processamento automático do texto pela IA.
              </p>

              {/* Drag n Drop Upload box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200 flex flex-col items-center justify-center min-h-[145px] ${
                  isDragging 
                    ? "border-amber-500 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]" 
                    : filename 
                    ? "border-amber-500/30 bg-[#120f08]" 
                    : "border-slate-800 hover:border-amber-500/35 bg-slate-950/40 hover:bg-slate-950/65 cursor-pointer"
                }`}
                onClick={filename ? undefined : triggerFileSelect}
              >
                <input
                  type="file"
                  id="contract-file-upload"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                />
                
                {filename ? (
                  <div className="w-full text-left animate-fade-in relative group">
                    <div className="flex items-start gap-3">
                      {/* Brand Format Badge */}
                      <div className={`w-10 h-10 shrink-0 font-sans font-black text-xs border rounded-lg flex items-center justify-center ${
                        filename.toLowerCase().endsWith(".pdf")
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          : filename.toLowerCase().endsWith(".docx")
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }`}>
                        {filename.toLowerCase().endsWith(".pdf") ? "PDF" : filename.toLowerCase().endsWith(".docx") ? "DOCX" : "TXT"}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-200 truncate max-w-[140px] sm:max-w-[180px]" title={filename}>
                            {filename}
                          </span>
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/15 rounded-full px-1.5 py-0.2 select-none uppercase font-mono">
                            Sucesso
                          </span>
                        </div>
                        
                        {/* Meta Data lines */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-850/60 text-[9px] text-slate-450 font-mono">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-550 font-sans">Tamanho:</span>
                            <span className="text-slate-300 font-semibold">{fileSize ? formatBytes(fileSize) : "N/D"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-555 font-sans">Conteúdo:</span>
                            <span className="text-slate-300 font-semibold">{contractText.length} cars</span>
                          </div>
                        </div>

                        {/* File Action Row */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-850/40">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerFileSelect();
                            }}
                            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold text-slate-300 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                          >
                            Substituir
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClear();
                            }}
                            className="bg-rose-955/20 hover:bg-rose-950/40 border border-rose-900/30 text-[10px] font-bold text-rose-450 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                          >
                            Remover
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-slate-900 text-slate-400 rounded-xl flex items-center justify-center mb-2.5 border border-slate-800">
                      <UploadCloud className="w-5.5 h-5.5 text-slate-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-300 block">
                      Arraste o documento aqui ou clique para buscar
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                      PDF, DOCX ou TXT até 15MB
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. OUTRAS CONFIGURAÇÕES E TEXT AREA OPCIONAL */}
            <div className="bg-slate-900/40 border border-slate-800/90 rounded-2xl shadow-xl p-5 backdrop-blur-md">
              <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2 mb-4 pb-2.5 border-b border-slate-800/80">
                <FileText className="w-4 h-4 text-slate-400" />
                Configurar Parâmetros de Análise
              </h2>

              {/* Quick load examples */}
              <div className="mb-5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Ou teste imediatamente com um exemplo de risco:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {EXAMPLE_CONTRACTS.map((eg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleLoadExample(idx)}
                      className="text-left text-xs p-2.5 hover:bg-amber-500/5 hover:border-amber-500/30 border border-slate-850 bg-slate-950/20 rounded-xl cursor-pointer transition-all duration-150 flex justify-between items-center group font-medium"
                    >
                      <div className="flex-1 pr-2 min-w-0">
                        <div className="text-slate-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                          <span className="font-bold text-slate-200 group-hover:text-amber-300 block truncate">{eg.title}</span>
                        </div>
                        <p className="text-slate-500 font-normal line-clamp-1 mt-0.5 text-[11px]">{eg.description}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 shrink-0 transition-transform group-hover:translate-x-1" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional View Modes if Contract under Analysis is present */}
              {analysis && (
                <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl mb-3.5 select-none animate-fade-in">
                  <button
                    type="button"
                    onClick={() => setLeftViewMode("editor")}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                      leftViewMode === "editor"
                        ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700/50"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Editor de Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftViewMode("reader")}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                      leftViewMode === "reader"
                        ? "bg-amber-500/10 text-amber-250 border border-amber-500/15 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    Leitor com Destaques
                  </button>
                </div>
              )}

              {/* Text editor or reader box container */}
              <div className="mb-4">
                {leftViewMode === "reader" && analysis ? (
                  <div className="border border-slate-800 bg-slate-950/75 rounded-2xl p-4 max-h-[350px] overflow-y-auto font-sans text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text animate-fade-in custom-scrollbar">
                    {highlightedSegments.map((seg, sIdx) => {
                      if (!seg.isHighlighted || !seg.clause) {
                        return <span key={sIdx}>{seg.text}</span>;
                      }

                      const cl = seg.clause;
                      const isClExpanded = expandedClauseId === cl.id;
                      let badgeColor = "bg-rose-500/15 text-rose-350 border-rose-500/30 hover:bg-rose-500/25";
                      if (cl.riskLevel === "Médio") {
                        badgeColor = "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25";
                      } else if (cl.riskLevel === "Baixo") {
                        badgeColor = "bg-amber-500/10 text-amber-200 border-amber-500/15 hover:bg-amber-500/20";
                      }

                      return (
                        <span
                          key={sIdx}
                          onClick={() => {
                            setExpandedClauseId(cl.id);
                            setActiveTab("executive"); // Switch active tab to executive risks
                            
                            // Smooth scroll to card
                            setTimeout(() => {
                              const el = document.getElementById(`clause-id-${cl.id}`);
                              if (el) {
                                el.scrollIntoView({ behavior: "smooth", block: "center" });
                              }
                            }, 100);
                          }}
                          title={`Cláusula Mapeada: ${cl.title} (Risco ${cl.riskLevel}). Clique para detalhes.`}
                          className={`inline rounded px-1 text-[11px] font-medium border-l-2 cursor-pointer transition-all duration-150 relative group ${badgeColor} ${
                            isClExpanded ? "ring-2 ring-amber-500/50 font-bold bg-amber-500/10" : ""
                          }`}
                        >
                          {seg.text}
                          
                          {/* Floating miniature popup tooltip details */}
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-slate-950/95 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 rounded-xl shadow-2xl z-[100] normal-case leading-normal pointer-events-none transition-all duration-200">
                            <span className="flex items-center gap-1.5 mb-1.5 font-bold font-sans">
                              <span className={`w-2 h-2 rounded-full ${
                                cl.riskLevel === "Alto" ? "bg-rose-500 animate-pulse" : cl.riskLevel === "Médio" ? "bg-amber-500" : "bg-amber-400"
                              }`}></span>
                              <span>{cl.title}</span>
                            </span>
                            <p className="font-sans font-normal text-slate-400 text-[10.5px] leading-relaxed mb-1.5">{cl.coreIssueSummary}</p>
                            <span className="text-[9.5px] text-amber-400 font-extrabold block font-sans">
                              Clique para destacar auditoria completa ⚖️
                            </span>
                          </span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {filename ? (
                      <div className="flex justify-between items-center mb-1.5 bg-slate-950/30 p-2.5 rounded-xl border border-slate-810">
                        <button
                          type="button"
                          onClick={() => setShowExtractedText(!showExtractedText)}
                          className="text-[10.5px] font-bold text-slate-300 hover:text-amber-400 cursor-pointer flex items-center gap-1.5 font-mono select-none"
                        >
                          {showExtractedText ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />}
                          {showExtractedText ? "Ocultar Texto Extraído" : "Ver Texto Completo Extraído"}
                        </button>
                        <span className="text-[9px] font-mono text-slate-500">
                          Editável se expandido
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center mb-1.5">
                        <label htmlFor="contract-body-editor" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                          Ou digite/cole as cláusulas abaixo:
                        </label>
                        {contractText && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-950/40 px-1.5 py-0.5 rounded border border-slate-810">
                            Caracteres: {contractText.length}
                          </span>
                        )}
                      </div>
                    )}

                    {(!filename || showExtractedText) && (
                      <textarea
                        id="contract-body-editor"
                        value={contractText}
                        onChange={(e) => {
                          setContractText(e.target.value);
                          if (filename) setFilename(""); // reset filename if user modifies manually
                        }}
                        rows={6}
                        placeholder="Selecione um arquivo de contrato acima ou digite/copie aqui as cláusulas principais para análise imediata..."
                        className="w-full text-xs font-mono p-3 bg-slate-950 text-slate-300 rounded-xl border border-slate-850 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-y block animate-fade-in"
                      />
                    )}
                  </>
                )}
              </div>

              {/* Gemini/Audit status (Profile Select is now fully abstracted into the automated 360º Master Prompt) */}
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
                  Mecanismo Inteligente:
                </label>
                <div className="bg-slate-950 border border-slate-850 text-slate-400 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-[11px] font-bold text-slate-300">Auditoria Completa 360º Ativa</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] bg-slate-900 text-slate-450 border border-slate-800 rounded px-1.5 py-0.5 leading-none shrink-0 font-mono font-medium uppercase">
                      Gemini 3.5 Fla.
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Target Instructions */}
              <div className="mb-5">
                <label htmlFor="custom-focus-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1 font-mono">
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                  Instruções Adicionais de Foco (Opcional):
                </label>
                <input
                  type="text"
                  id="custom-focus-input"
                  value={customFocus}
                  onChange={(e) => setCustomFocus(e.target.value)}
                  placeholder="Ex: 'Avalie as multas presumindo que sou fornecedor'"
                  className="w-full text-xs bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-555"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isLoading || !contractText}
                  className="flex-1 bg-slate-850 hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed text-slate-300 font-bold text-xs py-2.5 px-3 rounded-xl border border-slate-750 flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isLoading || !contractText || contractText.trim().length < 40}
                  className="flex-[2] bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-850 disabled:cursor-not-allowed text-black font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-amber-500/10"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                      <span>Executando Auditoria...</span>
                    </div>
                  ) : (
                    <>
                      <Scale className="w-4 h-4 text-black animate-pulse" />
                      <span>Executar Auditoria Completa</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Real-time Danger Terms Scanner (Requisitado) */}
            <div className="bg-slate-900/40 border border-slate-800/90 rounded-2xl shadow-xl p-5 backdrop-blur-md flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2 mb-1">
                  <Search className="w-4 h-4 text-amber-500 animate-pulse" />
                  Scanner de Expressões de Risco
                </h2>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-normal">
                  Identifica padrões textuais de gatilhos de risco baseados em expressões jurídicas de assimetria. Passe o mouse para conhecer os critérios de risco.
                </p>
              </div>

              {!contractText ? (
                <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center text-slate-500 text-xs py-6 flex flex-col items-center gap-1">
                  <Info className="w-5 h-5 text-slate-600 mb-1" />
                  <span>Nenhum documento ou texto carregado para escaneamento.</span>
                  <span className="text-[10px] text-slate-600">O scanner iniciará instantaneamente ao colar ou carregar um contrato.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Summary Header */}
                  <div className="flex items-center justify-between text-[11px] font-mono bg-slate-950/40 p-2 border border-slate-850 rounded-lg">
                    <span className="text-slate-450">Gatilhos Críticos Identificados:</span>
                    <span className={`font-black px-1.5 py-0.2 rounded-md ${
                      scanResults.filter(r => r.count > 0).length > 0 
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/15 animate-pulse" 
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/15"
                    }`}>
                      {scanResults.filter(r => r.count > 0).length} de {scanResults.length}
                    </span>
                  </div>

                  {/* Grid of risk categories */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {scanResults.map((result) => {
                      const isFound = result.count > 0;
                      const isTargeted = selectedScanTerm === result.name;
                      return (
                        <div 
                          key={result.name}
                          onClick={() => {
                            if (isFound) {
                              setSelectedScanTerm(isTargeted ? null : result.name);
                            }
                          }}
                          className={`relative group/scan border rounded-xl p-2.5 transition-all duration-150 text-left select-none ${
                            isFound 
                              ? isTargeted
                                ? "bg-rose-550/10 border-rose-500/50 cursor-pointer shadow-[0_0_12px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/20"
                                : "bg-rose-950/5 border-rose-500/15 hover:border-rose-500/35 cursor-pointer shadow-[0_2px_8px_-3px_rgba(244,63,94,0.1)]" 
                              : "bg-slate-950/15 border-slate-850 hover:border-slate-800"
                          }`}
                        >
                          {/* Hover Tooltip inside scan card */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover/scan:block w-80 p-3 bg-slate-950/98 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.85)] z-50 pointer-events-none transition-all duration-155 text-left">
                            <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${result.riskLevel === "Alto" ? "bg-rose-500 animate-pulse" : "bg-amber-400 animate-pulse"}`}></span>
                              <span>{result.name}</span>
                              <span className="text-[8px] px-1 bg-slate-900 border border-slate-800 rounded font-mono text-slate-400 ml-auto uppercase">Risco {result.riskLevel}</span>
                            </div>
                            <p className="leading-relaxed mb-2 font-normal text-slate-400">{result.description}</p>
                            
                            {isFound && result.matches && result.matches.length > 0 && (
                              <div className="mb-2 p-2 bg-rose-500/5 border border-rose-500/10 rounded-lg flex flex-col gap-1.5 pointer-events-none">
                                <div className="text-[8.5px] text-rose-400 uppercase tracking-wider font-mono font-extrabold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                  Cláusula / Trecho Problemático:
                                </div>
                                <div className="max-h-24 overflow-y-auto pr-1 flex flex-col gap-1">
                                  {result.matches.slice(0, 2).map((matchTxt, mIdx) => (
                                    <div key={mIdx} className="text-[9px] font-mono text-rose-200/90 leading-tight bg-rose-950/20 px-1.5 py-1 rounded border border-rose-900/10">
                                      "{matchTxt}"
                                    </div>
                                  ))}
                                  {result.matches.length > 2 && (
                                    <span className="text-[8px] text-slate-500 italic block text-right mt-0.5">
                                      + {result.matches.length - 2} ocorrência(s) encontrada(s)
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="text-[10px] bg-slate-900 border border-slate-850 px-2 py-1.5 rounded-lg text-amber-400 font-medium flex flex-col gap-0.5">
                              <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono font-bold">Ação Recomendada (Blindagem):</span>
                              {result.mitigation}
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-slate-800 font-normal"></div>
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className={`text-[11.5px] font-extrabold truncate ${isFound ? "text-rose-200" : "text-slate-350"}`}>
                                {result.name}
                              </span>
                              <span className="text-[8.5px] font-mono text-slate-600 truncate max-w-[120px]">
                                {result.pattern.source}
                              </span>
                            </div>

                            <span className={`text-[9px] font-extrabold uppercase font-mono px-1.5 py-0.5 rounded-full border leading-tight ${
                              isFound 
                                ? result.riskLevel === "Alto" 
                                  ? "bg-rose-500/10 text-rose-450 border-rose-500/20 animate-pulse" 
                                  : "bg-amber-500/10 text-amber-300 border-amber-500/20" 
                                : "bg-amber-500/5 text-amber-500/30 border-amber-500/10"
                            }`}>
                              {isFound ? `${result.count}x` : "0x"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-850/60 text-[9px] font-medium">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isFound 
                                ? result.riskLevel === "Alto" ? "bg-rose-500" : "bg-amber-500" 
                                : "bg-slate-700"
                            }`}></span>
                            <span className={isFound ? "text-rose-400/80 font-bold" : "text-slate-550"}>
                              {isFound ? "Gatilho Detectado" : "Nenhum Match"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expanded occurrences subview */}
                  <AnimatePresence>
                    {selectedScanTerm && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-3 overflow-hidden shadow-xl"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-900">
                          <span className="text-[10px] font-bold text-slate-100 font-mono flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-amber-500 animate-bounce" />
                            <span>Mapeamento de Expressão: <span className="text-amber-400 font-sans font-extrabold">{selectedScanTerm}</span></span>
                          </span>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedScanTerm(null);
                            }}
                            className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer font-mono font-bold hover:underline"
                          >
                            Fechar
                          </button>
                        </div>

                        {/* Associated Clauses (User's high priority directive) */}
                        <div className="text-left">
                          <span className="text-[9.5px] font-bold text-amber-400/90 uppercase tracking-wide block mb-1.5 font-mono">
                            ⚖️ Cláusulas Identificadas que Contêm este Risco:
                          </span>
                          
                          {!analysis ? (
                            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 text-[10px] text-slate-450 leading-relaxed font-sans">
                              Solicite a <span className="font-bold text-amber-500">Auditoria Completa 360º de IA</span> acima para gerar as minutas corretivas e rastrear as cláusulas mapeadas instantaneamente no texto!
                            </div>
                          ) : clausesMatchingTerm[selectedScanTerm] && clausesMatchingTerm[selectedScanTerm].length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {clausesMatchingTerm[selectedScanTerm].map((clause) => {
                                let badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/15";
                                if (clause.riskLevel === "Médio") {
                                  badgeColor = "bg-amber-500/10 text-amber-300 border-amber-500/15";
                                } else if (clause.riskLevel === "Baixo") {
                                  badgeColor = "bg-amber-500/5 text-amber-200 border-amber-500/10";
                                }

                                return (
                                  <button
                                    key={clause.id}
                                    type="button"
                                    onClick={() => {
                                      setExpandedClauseId(clause.id);
                                      setActiveTab("executive"); // Make sure the user is seeing executive tab
                                      
                                      // Smooth scroll to card
                                      setTimeout(() => {
                                        const el = document.getElementById(`clause-id-${clause.id}`);
                                        if (el) {
                                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                                        }
                                      }, 100);
                                    }}
                                    className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-slate-800 p-2 rounded-lg cursor-pointer transition-all duration-150 flex items-center justify-between gap-1 group"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[10.5px] font-bold text-slate-200 group-hover:text-amber-400 transition-colors truncate">
                                        {clause.title}
                                      </div>
                                      <div className="text-[9px] text-slate-450 truncate line-clamp-1 mt-0.5 max-w-[280px]">
                                        "{clause.originalClause}"
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded border uppercase font-mono ${badgeColor}`}>
                                        {clause.riskLevel}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 text-[10px] text-slate-500 font-sans">
                              Nenhuma cláusula jurídica rotulada explicitamente com este termo. No entanto, houve menção lexical no texto bruto.
                            </div>
                          )}
                        </div>

                        {/* Text snippets / raw matches */}
                        <div className="text-left mt-1">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 font-mono">
                            🔍 Frases com o Termo no Contrato:
                          </span>
                          <div className="max-h-32 overflow-y-auto flex flex-col gap-1.5 pr-1 scrollbar-thin">
                            {scanResults.find(r => r.name === selectedScanTerm)?.matches.map((matchSnippet, mIdx) => (
                              <div 
                                key={mIdx}
                                className="text-[10px] bg-[#0c0d10] border border-slate-850 p-2 rounded-lg text-slate-350 font-mono leading-relaxed"
                              >
                                <span className="text-amber-500/50 font-bold mr-1.5 font-sans">{mIdx + 1}.</span>
                                {matchSnippet}
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Overall Warning Banner if terms exist */}
                  {scanResults.some(r => r.count > 0) && (
                    <div className="bg-rose-500/5 border border-rose-500/10 text-rose-350 p-2.5 rounded-lg text-[10.5px] leading-relaxed flex items-start gap-2 text-left">
                      <AlertTriangle className="w-4 h-4 text-rose-450 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        Antes de consultar a IA, detectamos <span className="font-extrabold text-rose-200">{scanResults.filter(r => r.count > 0).length} gatilho(s) crítico(s)</span> baseados nas expressões procuradas. Clique sobre os itens para Ver Ocorrências locais.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assistance Card */}
            <div className="bg-[#18120d]/50 border border-amber-500/10 text-slate-300 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-12 h-1 bg-amber-500"></div>
              <h3 className="font-extrabold text-sm text-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                Arquitetura de Blindagem Ativa
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mt-2.5">
                Para cada risco processado, a IA reescreve a redação mantendo um teor comercialmente viável mas favorável aos seus interesses. Com o "Resumo de Impacto" e notas de correlações ("Relações Contratuais"), você compreende imediatamente a interdependência dos termos contratuais.
              </p>
            </div>

          </section>

          {/* Right Panel - Interactive Results Display */}
          <section className="lg:col-span-7" id="output-section">
            
            {/* Loading placeholder */}
            {isLoading && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-10 shadow-xl min-h-[500px] flex flex-col items-center justify-center text-center animate-pulse backdrop-blur-md">
                <div className="w-16 h-16 bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center rounded-2xl mb-4 animate-bounce shadow-lg shadow-amber-500/5">
                  <Scale className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-100">Executando Auditoria Jurídica Profissional</h3>
                <p className="text-slate-400 text-xs mt-2 max-w-sm leading-relaxed">
                  Buscando cláusulas assimétricas, calculando probabilidade de inadimplemento, mapeando relações interdependentes e gerando blocos de redação defensiva...
                </p>
                
                {/* Progress Visual bar */}
                <div className="w-full max-w-xs bg-slate-950 h-2 rounded-full mt-6 overflow-hidden border border-slate-800">
                  <div className="bg-amber-500 h-full rounded-full animate-pulse transition-all duration-300" style={{ width: "75%" }}></div>
                </div>

                <div className="mt-5 p-3 bg-slate-950/40 rounded-xl max-w-md border border-slate-850">
                  <span className="text-xs font-mono font-semibold text-amber-400 flex items-center justify-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    Fase Corrente: {loadingStep}
                  </span>
                </div>
              </div>
            )}

            {/* Result display */}
            {!isLoading && analysis && (
              <div className="flex flex-col gap-6">

                {/* KPI score overview card */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl p-6 backdrop-blur-md">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    
                    {/* Score section */}
                    <div className="flex items-center gap-4">
                      
                      {/* Circular Gauge */}
                      <div className="relative w-20 h-20 flex items-center justify-center select-none shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-800"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={
                              analysis.healthScore >= 75 
                                ? "text-amber-500" 
                                : analysis.healthScore >= 50 
                                ? "text-amber-500" 
                                : "text-rose-500"
                            }
                            strokeWidth="3.5"
                            strokeDasharray={`${analysis.healthScore}, 100`}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-extrabold text-slate-100 leading-none">
                            {analysis.healthScore}
                          </span>
                          <span className="text-[8px] font-extrabold text-slate-450 tracking-wider uppercase mt-0.5 font-mono">
                            Score
                          </span>
                        </div>
                      </div>

                      {/* Verdict Text */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-mono">
                          Parecer do Auditor
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getVerdictStyles(analysis.verdict).icon}
                          <span className={`text-base font-extrabold ${getVerdictStyles(analysis.verdict).text}`}>
                            {getVerdictStyles(analysis.verdict).colorLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 max-w-sm leading-relaxed mt-1">
                          {analysis.verdictDescription}
                        </p>
                      </div>

                    </div>

                    {/* Summary Counts */}
                    <div className="flex gap-4 border-t border-slate-800 md:border-t-0 md:border-l md:border-slate-800 md:pl-6 pt-4 md:pt-0 shrink-0 w-full md:w-auto justify-around">
                      <div className="text-center px-3">
                        <span className="text-2xl font-extrabold text-rose-500 block leading-none">
                          {analysis.clauses.filter(c => c.riskLevel === "Alto").length}
                        </span>
                        <span className="text-[9px] font-bold text-rose-450 bg-rose-500/10 border border-rose-500/20 rounded-full px-2 py-0.5 mt-2 block font-mono">
                          Alto Risco
                        </span>
                      </div>
                      
                      <div className="text-center px-3">
                        <span className="text-2xl font-extrabold text-amber-500 block leading-none">
                          {analysis.clauses.filter(c => c.riskLevel === "Médio").length}
                        </span>
                        <span className="text-[9px] font-bold text-amber-350 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 mt-2 block font-mono">
                          Médio Risco
                        </span>
                      </div>

                      <div className="text-center px-3">
                        <span className="text-2xl font-extrabold text-amber-500 block leading-none">
                          {analysis.clauses.filter(c => c.riskLevel === "Baixo").length}
                        </span>
                        <span className="text-[9px] font-bold text-amber-350 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 mt-2 block font-mono">
                          Baixo / OK
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Sub Tab selection & Actions panel */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-2.5 shadow-md">
                  
                  {/* Tabs */}
                  <div className="flex bg-slate-950/60 p-1 border border-slate-850 rounded-xl space-x-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("executive")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "executive"
                          ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700/50"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Auditoria de Riscos
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("markdown")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "markdown"
                          ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700/50"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Parecer Geral (MD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("blindagem")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "blindagem"
                          ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700/50"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Foco: Blindagem
                    </button>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyFullReport}
                      className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-350 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
                    >
                      {copiedFull ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          <span className="text-amber-400 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Relatório</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadWordABNT}
                      className="bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Baixar Word (ABNT)</span>
                    </button>
                  </div>

                </div>

                {/* Sub Tab View Renderers */}
                <div>
                  
                  {/* Exec / Interactive cards tab */}
                  {activeTab === "executive" && (
                    <div className="flex flex-col gap-4">
                      
                      {/* Search & Risk filters */}
                      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col gap-3 backdrop-blur-md">
                        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                          {/* Search input with icons */}
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Pesquise riscos por título ou conteúdo em tempo real..."
                              className="w-full text-xs bg-slate-950 border border-slate-850 rounded-lg pl-9 pr-10 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all duration-150"
                            />
                            {searchTerm && (
                              <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] cursor-pointer transition-colors"
                                title="Limpar busca"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Filter criteria */}
                          <div className="flex items-center gap-1.5 shrink-0 bg-slate-950/65 border border-slate-850 rounded-lg p-1 overflow-x-auto">
                            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider px-1.5 shrink-0 font-mono">
                              Nível:
                            </span>
                            <button
                              type="button"
                              onClick={() => setRiskFilter("all")}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold cursor-pointer transition-colors leading-none ${
                                riskFilter === "all"
                                  ? "bg-slate-850 text-slate-100"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                              }`}
                            >
                              Tudo
                            </button>
                            <button
                              type="button"
                              onClick={() => setRiskFilter("Alto")}
                              className={`px-2 py-1 leading-none rounded-md text-[10px] font-extrabold cursor-pointer transition-colors flex items-center gap-1 ${
                                riskFilter === "Alto"
                                  ? "bg-rose-600 text-white"
                                  : "text-rose-450 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-950"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                              Alto
                            </button>
                            <button
                              type="button"
                              onClick={() => setRiskFilter("Médio")}
                              className={`px-2 py-1 leading-none rounded-md text-[10px] font-extrabold cursor-pointer transition-colors flex items-center gap-1 ${
                                riskFilter === "Médio"
                                  ? "bg-amber-600 text-white"
                                  : "text-amber-450 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-950"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                              Médio
                            </button>
                            <button
                              type="button"
                              onClick={() => setRiskFilter("Baixo")}
                              className={`px-2 py-1 leading-none rounded-md text-[10px] font-extrabold cursor-pointer transition-colors flex items-center gap-1 ${
                                riskFilter === "Baixo"
                                  ? "bg-amber-600 text-black"
                                  : "text-amber-400 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-950"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                              Baixo
                            </button>
                          </div>
                        </div>

                        {/* Real-time Results helper badge */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/40">
                          <span>
                            Filtro em tempo real ativo
                          </span>
                          <span>
                            Exibindo <span className="font-extrabold text-amber-400">{filteredClauses.length}</span> de <span className="text-slate-350">{analysis?.clauses.length}</span> riscos mapeados
                          </span>
                        </div>
                      </div>

                      {/* Risk items cards */}
                      {filteredClauses.length > 0 ? (
                        <div className="flex flex-col gap-4">
                          {filteredClauses.map((clause) => {
                            const isExpanded = expandedClauseId === clause.id;
                            
                            // Check if relationship is present
                            const hasRelations = clause.relations && 
                              clause.relations.toLowerCase() !== "nenhuma" && 
                              !clause.relations.toLowerCase().includes("sem referências") && 
                              !clause.relations.toLowerCase().includes("sem relações");

                            return (
                              <div
                                key={clause.id}
                                id={`clause-id-${clause.id}`}
                                className={`bg-slate-900/30 border rounded-2xl shadow-md transition-all duration-200 relative ${
                                  isExpanded 
                                    ? "border-amber-500/50 ring-1 ring-amber-500/20" 
                                    : "border-slate-800 hover:border-slate-750"
                                }`}
                              >
                                {/* Clause Card Header */}
                                <div
                                  onClick={() => setExpandedClauseId(isExpanded ? null : clause.id)}
                                  className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-950/30 hover:bg-slate-950/50 rounded-t-2xl"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                                    <RiskBadgeWithTooltip level={clause.riskLevel} size="large" />
                                    
                                    {/* EXPLICIT INTERDEPENDENCE BADGE (Requisitado) */}
                                    {hasRelations && (
                                      <span className="text-[9px] bg-slate-900 text-amber-300 border border-amber-500/20 font-mono font-bold px-2 py-0.5 rounded-full shadow-inner flex items-center gap-1 shrink-0">
                                        <BookOpen className="w-3 h-3 text-amber-400 shrink-0" />
                                        {clause.relations}
                                      </span>
                                    )}

                                    <h3 className="font-extrabold text-xs text-slate-250 truncate leading-none md:max-w-xs shrink-0 max-w-[150px]">
                                      {clause.title}
                                    </h3>
                                  </div>
                                  <div className="shrink-0 text-slate-500">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </div>
                                </div>

                                {/* EXPLICIT ONE-SENTENCE SUMMARY DIRECTLY BELOW RISK LEVEL (Requisitado) */}
                                <div className="px-4 pb-3 pt-1 border-b border-slate-850/30 bg-slate-950/15">
                                  <div className="text-xs text-rose-300 font-medium pl-2.5 border-l-2 border-rose-500/50 py-1 bg-rose-950/10 rounded-r">
                                    <span className="font-extrabold text-rose-200">Resumo de Impacto: </span>
                                    {clause.coreIssueSummary || "Alerta de assimetria passível de mitigação."}
                                  </div>
                                </div>

                                {/* Body */}
                                {isExpanded && (
                                  <div className="p-5 border-t border-slate-850/80 bg-slate-950/20 flex flex-col gap-4 animate-fade-in">
                                    
                                    {/* Risk Explanation */}
                                    <div>
                                      <span className="text-[10px] font-bold text-rose-450 uppercase tracking-wider block mb-1">
                                        ⚠️ Por que é perigosa:
                                      </span>
                                      <p className="text-xs text-slate-300 leading-relaxed bg-rose-500/5 p-3.5 rounded-lg border border-rose-500/10">
                                        {clause.dangerExplanation}
                                      </p>
                                    </div>

                                    {/* Two-Column split for Original vs Refactored Wording */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      
                                      {/* Original Block */}
                                      <div className="bg-slate-950/45 border border-slate-850 rounded-xl p-3.5 flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-none mb-2.5 font-mono">
                                          Minuta Original / Trecho Encontrado:
                                        </span>
                                        <blockquote className="text-xs font-mono text-slate-400 whitespace-pre-line leading-relaxed italic border-l-2 border-slate-800 pl-3 py-1 flex-1">
                                          {clause.originalClause}
                                        </blockquote>
                                        <div className="mt-3.5 pt-3.5 border-t border-slate-900 flex justify-between items-center bg-slate-900/20 -mx-3.5 -mb-3.5 px-3 py-2 rounded-b-xl border-dashed">
                                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded uppercase font-mono">
                                            Ação: {clause.recommendedAction}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopyText(clause.originalClause, `${clause.id}-orig`)}
                                            className="text-[10px] font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer bg-slate-900 hover:bg-slate-850 px-2 py-1 rounded"
                                          >
                                            {copiedId === `${clause.id}-orig` ? (
                                              <>
                                                <Check className="w-3 h-3 text-amber-400" />
                                                <span className="text-amber-400">Copiada!</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" />
                                                <span>Copiar</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Suggested / Blindado Block */}
                                      <div className="bg-amber-950/20 border border-amber-500/15 rounded-xl p-3.5 flex flex-col">
                                        <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5 leading-none shrink-0 flex items-center gap-1 font-mono uppercase tracking-wider mb-2.5 self-start">
                                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                          Redação de Blindagem Sugerida:
                                        </span>
                                        <div className="text-xs font-semibold text-slate-200 pl-3 border-l-2 border-amber-500 py-1 flex-1 leading-relaxed whitespace-pre-line">
                                          {clause.suggestedDraft}
                                        </div>
                                        <div className="mt-3.5 pt-3.5 border-t border-amber-950/60 flex justify-between items-center bg-amber-500/5 -mx-3.5 -mb-3.5 px-3 py-2 rounded-b-xl border-dashed">
                                          <span className="text-[9px] font-extrabold text-amber-400 flex items-center gap-1 leading-none">
                                            ✓ Pronta para contraproposta
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopyText(clause.suggestedDraft, `${clause.id}-suggestion`)}
                                            className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer bg-amber-950 hover:bg-amber-900 border border-amber-850 px-2 py-1 rounded"
                                          >
                                            {copiedId === `${clause.id}-suggestion` ? (
                                              <>
                                                <Check className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                                <span className="text-amber-400">Copiada!</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>Copiar Redação</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                    </div>

                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-8 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-3">
                          <span>Nenhum risco com os filtros aplicados ("{searchTerm}" / Nível de Risco: {riskFilter}).</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm("");
                              setRiskFilter("all");
                            }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 cursor-pointer transition-colors shadow-md"
                          >
                            Limpar Filtros e Pesquisa
                          </button>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Complete Markdown Output Tab */}
                  {activeTab === "markdown" && (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-md backdrop-blur-md">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4 bg-slate-950/50 -mx-6 -mt-6 p-4 rounded-t-2xl">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <BookOpen className="w-4 h-4 text-amber-500" />
                          Relatório Integrado de Auditoria (Markdown)
                        </span>
                        <div className="text-[10px] font-semibold text-slate-500 font-mono">
                          Formato de compatibilidade total
                        </div>
                      </div>
                      
                      <div className="markdown-body text-sm text-slate-300 leading-relaxed space-y-4">
                        <Markdown>{analysis.rawMarkdown}</Markdown>
                      </div>
                    </div>
                  )}

                  {/* Focused Blindagem Tab */}
                  {activeTab === "blindagem" && (
                    <div className="flex flex-col gap-4">
                      
                      {/* Section alert explaining what's here */}
                      <div className="bg-[#18120d]/50 border border-amber-500/10 rounded-2xl p-4 shadow-md flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                        <div>
                          <h4 className="font-bold text-sm text-slate-200">Cláusulas de Blindagem Ativas</h4>
                          <p className="text-xs text-slate-400 leading-relaxed mt-1">
                            Esta seção reúne apenas as contrapropostas de blindagem jurídica que reequilibram os riscos detectados no contrato original. Utilize para copiar e contrapropor rapidamente.
                          </p>
                        </div>
                      </div>

                      {analysis.clauses.map((clause) => (
                        <div key={clause.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <h4 className="font-extrabold text-sm text-slate-200">
                                {clause.title}
                              </h4>
                              <RiskBadgeWithTooltip level={clause.riskLevel} size="small" />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(clause.suggestedDraft, `${clause.id}-shield-focus`)}
                              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer bg-amber-950 hover:bg-amber-900 rounded-lg px-2.5 py-1 border border-amber-500/25 transition-colors duration-150"
                            >
                              {copiedId === `${clause.id}-shield-focus` ? (
                                <>
                                  <Check className="w-3 h-3 text-amber-400" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar Redação</span>
                                </>
                              )}
                            </button>
                          </div>
                          
                          {/* Display Core Issue summary */}
                          <div className="px-3.5 py-2.5 mb-3 rounded-lg bg-rose-500/5 border border-rose-500/10 text-xs">
                            <span className="text-[10px] font-bold text-rose-450 uppercase block mb-1 font-mono">
                              Impacto Detectado:
                            </span>
                            <p className="text-slate-300 font-medium">
                              {clause.coreIssueSummary || clause.dangerExplanation}
                            </p>
                          </div>

                          <div className="bg-amber-950/20 border border-amber-500/15 rounded-xl p-4">
                            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1 leading-none font-mono">
                              <ShieldCheck className="w-4 h-4 text-amber-400" />
                              Nova Redação de Blindagem Sugerida:
                            </span>
                            <p className="text-xs text-slate-200 font-medium whitespace-pre-line leading-relaxed">
                              {clause.suggestedDraft}
                            </p>
                          </div>
                        </div>
                      ))}

                    </div>
                  )}

                </div>

              </div>
            )}

            {/* Empty state dashboard placeholder */}
            {!isLoading && !analysis && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-10 shadow-xl min-h-[500px] flex flex-col items-center justify-center text-center backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-[80px]"></div>
                
                {/* Scales Icon Graphic Container */}
                <div className="w-16 h-16 bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center rounded-2xl mb-5 shadow-inner">
                  <Scale className="w-7 h-7 text-amber-400" />
                </div>
                
                <h3 className="text-lg font-extrabold text-slate-100 tracking-tight">Análise Jurídica Pronta para Operar</h3>
                <p className="text-slate-400 text-xs mt-2 max-w-sm leading-relaxed">
                  Mitigue riscos contratuais corporativos em segundos. Faça o upload do arquivo de contrato no espaço específico à esquerda ou clique em algum exemplo rápido para iniciar.
                </p>

                {/* Dashboard stats cards (decorative visual layout help) */}
                <div className="grid grid-cols-3 gap-3 mt-8 w-full max-w-md">
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                    <span className="text-base font-extrabold text-slate-100 block">SaaS</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase font-mono tracking-wider mt-1 block">Fidelidade & SLA</span>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                    <span className="text-base font-extrabold text-slate-100 block">NDAs</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase font-mono tracking-wider mt-1 block">Confidência</span>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                    <span className="text-base font-extrabold text-slate-100 block">TI & IP</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase font-mono tracking-wider mt-1 block">Propriedade IP</span>
                  </div>
                </div>

                {/* Quick start instructions */}
                <div className="mt-8 flex items-center gap-1.5 text-xs text-slate-400 justify-center">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="font-semibold text-slate-400 font-mono text-[11px]">Tecnologia Gemini 3.5 com Baixíssima Latência</span>
                </div>

              </div>
            )}

          </section>

        </div>

      </div>

      {/* Styled Footer */}
      <footer className="mt-16 border-t border-slate-850/80 py-8 text-center relative overflow-hidden">
        <p className="text-xs text-slate-500">
          ⚖️ Legal AI - Analisador e Blindagem de Contratos • Desenvolvido com inteligência analítica em tempo real.
        </p>
        <p className="text-[10px] text-slate-650 mt-1.5 max-w-2xl mx-auto px-4 leading-relaxed">
          Aviso Importante: O relatório gerado pela nossa IA possui teor puramente consultivo e informativo para apoiar processos de negociação comercial de minutas. Não substitui e não exime a necessidade de assessoria jurídica contínua prestada por um profissional de Direito credenciado.
        </p>
      </footer>
    </div>
  );
}

// Define global cache for criteria to prevent multiple network calls for the same level
const criteriaCache: Record<string, { title: string; explanation: string }> = {};

// Risk badge with hover-triggered explanatory tooltip and dynamic backend synchronization
function RiskBadgeWithTooltip({ level, size = "large" }: { level: RiskLevel; size?: "small" | "large" }) {
  const badgeClasses = size === "large"
    ? "text-[9px] font-extrabold border rounded-full px-2.5 py-0.5 leading-none shrink-0 font-mono uppercase"
    : "text-[8px] font-bold border rounded px-1.5 py-0.2 select-none font-mono uppercase";

  const getLocalExplanation = (lvl: RiskLevel) => {
    switch (lvl) {
      case "Alto":
        return "Cláusula com alto potencial de gerar ônus desproporcional, multas abusivas ou perda de direitos críticos. Recomendável revisão ou recusa imediata.";
      case "Médio":
        return "Cláusula que impõe obrigações severas ou restrições que merecem atenção e renegociação moderada para restabelecer o equilíbrio.";
      case "Baixo":
        return "Cláusula dentro das conformidades normais de mercado ou termos saudáveis com impacto favorável e equilibrado.";
      default:
        return "Critério de risco desconhecido.";
    }
  };

  const getLocalTitle = (lvl: RiskLevel) => {
    switch (lvl) {
      case "Alto":
        return "Crítico / Alta Nocividade";
      case "Médio":
        return "Moderado / Atenção";
      case "Baixo":
        return "Saudável / Baixo Impacto";
      default:
        return "Desconhecido";
    }
  };

  const getBadgeColors = (lvl: RiskLevel) => {
    switch (lvl) {
      case "Alto":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25";
      case "Médio":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25";
      case "Baixo":
        return "bg-amber-500/10 text-amber-200 border-amber-500/15 hover:bg-amber-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  // State for fetched data - initialized from cache if available
  const [data, setData] = useState<{ title: string; explanation: string } | null>(
    criteriaCache[level] || null
  );
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const handleMouseEnter = async () => {
    if (level === "Desconhecido" || data || isFetching) {
      return;
    }

    // Double check cache
    if (criteriaCache[level]) {
      setData(criteriaCache[level]);
      return;
    }

    setIsFetching(true);
    try {
      const response = await fetch(`/api/risk-criteria/${level}`);
      if (response.ok) {
        const json = await response.json();
        const fetched = {
          title: json.title || getLocalTitle(level),
          explanation: json.explanation || getLocalExplanation(level)
        };
        criteriaCache[level] = fetched;
        setData(fetched);
      } else {
        throw new Error("HTTP error " + response.status);
      }
    } catch (err) {
      console.error("Erro ao carregar critérios do servidor:", err);
      // Fail gracefully: use local fallback and save to cache so we don't spam broken requests
      const fallback = {
        title: getLocalTitle(level),
        explanation: getLocalExplanation(level)
      };
      criteriaCache[level] = fallback;
      setData(fallback);
    } finally {
      setIsFetching(false);
    }
  };

  const displayedTitle = data ? data.title : getLocalTitle(level);
  const displayedExplanation = data ? data.explanation : getLocalExplanation(level);

  return (
    <div 
      className="relative group inline-block select-none"
      onMouseEnter={handleMouseEnter}
    >
      <span className={`${badgeClasses} ${getBadgeColors(level)} risk-badge cursor-help transition-all duration-150 ${level === "Alto" ? "risk-badge-alto" : ""}`}>
        {size === "large" ? `Risco ${level}` : `RISCO ${level}`}
      </span>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-72 p-3 bg-slate-950/95 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.7)] z-50 pointer-events-none transition-all duration-200">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`w-2 h-2 rounded-full ${
            level === "Alto" ? "bg-rose-500 animate-pulse" : level === "Médio" ? "bg-amber-500 animate-pulse" : "bg-amber-400 animate-pulse"
          }`}></span>
          <span className="font-bold text-slate-200 font-sans whitespace-nowrap">
            Critério: {displayedTitle}
          </span>
          {isFetching && (
            <span className="text-[8px] text-slate-500 ml-auto flex items-center gap-1">
              <svg className="animate-spin h-2.5 w-2.5 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sync
            </span>
          )}
        </div>
        <p className="text-slate-400 leading-relaxed font-sans font-normal text-left normal-case tracking-normal">
          {displayedExplanation}
        </p>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-slate-800 z-50"></div>
      </div>
    </div>
  );
}
