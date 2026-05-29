export interface ContractDocument {
  name: string;
  size: number;
  type: string;
  text: string;
}

export type RiskLevel = "Alto" | "Médio" | "Baixo" | "Desconhecido";

export interface RiskClause {
  id: string;
  title: string;
  originalClause: string;
  riskLevel: RiskLevel;
  dangerExplanation: string;
  recommendedAction: string;
  suggestedDraft: string;
  coreIssueSummary: string; // One-sentence summary highlighting the core issue
  relations: string;        // Notes like "Referenced in Clause X" or "Modifies Clause Y" or "Nenhuma"
}

export interface ContractAnalysisResult {
  rawMarkdown: string;
  clauses: RiskClause[];
  healthScore: number; // 0 - 100
  verdict: "Aprovar" | "Aprovar com Ressalvas" | "Rejeitar e Renegociar" | "Desconhecido";
  verdictDescription: string;
}

export interface ExampleContract {
  title: string;
  description: string;
  filename: string;
  text: string;
  profile: "comercial" | "tecnologia" | "parceria";
}
