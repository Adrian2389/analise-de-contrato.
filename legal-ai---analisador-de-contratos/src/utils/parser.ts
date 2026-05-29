import { RiskClause, RiskLevel, ContractAnalysisResult } from "../types";

export function parseContractReport(markdown: string): ContractAnalysisResult {
  const clauses: RiskClause[] = [];
  let healthScore = 70; // fallback standard
  let verdict: "Aprovar" | "Aprovar com Ressalvas" | "Rejeitar e Renegociar" | "Desconhecido" = "Aprovar com Ressalvas";
  let verdictDescription = "O contrato apresenta cláusulas assimétricas que exigem negociação ativa.";

  // Split section by "###" mark
  const parts = markdown.split(/(?=###\s+)/);

  let tempId = 1;
  for (const part of parts) {
    if (!part.trim().startsWith("###")) {
      continue;
    }

    // Split headers & lines
    const lines = part.split("\n");
    const titleLine = lines[0] || "";
    // Remove the markdown formatting for cleaner rendering
    const title = titleLine.replace(/^###\s+/, "").trim().replace(/[\[\]]/g, "");

    const bodyText = part;

    // Direct extraction based on standard bullet outputs
    // Support Portuguese variants in response
    const originalMatch = bodyText.match(/-\s+\*\*Cláusula Original:\*\*\s*([\s\S]*?)(?=(?:\n-\s+\*\*|\n---|\n###|\Z))/i);
    const riskMatch = bodyText.match(/-\s+\*\*Nível de Risco:\*\*\s*(.*)/i);
    const dangerMatch = bodyText.match(/-\s+\*\*Por que é perigosa:\*\*\s*([\s\S]*?)(?=(?:\n-\s+\*\*|\n---|\n###|\Z))/i);
    const actionMatch = bodyText.match(/-\s+\*\*Ação Recomendada:\*\*\s*(.*)/i);
    const draftMatch = bodyText.match(/-\s+\*\*Blindagem Jurídica:\*\*\s*([\s\S]*?)(?=(?:\n-\s+\*\*|\n---|\n###|\Z))/i);
    const coreIssueMatch = bodyText.match(/-\s+\*\*Resumo de Impacto:\*\*\s*([\s\S]*?)(?=(?:\n-\s+\*\*|\n---|\n###|\Z))/i);
    const relationsMatch = bodyText.match(/-\s+\*\*Relações Contratuais:\*\*\s*([\s\S]*?)(?=(?:\n-\s+\*\*|\n---|\n###|\Z))/i);

    // Parse risk level
    let riskLevel: RiskLevel = "Desconhecido";
    if (riskMatch && riskMatch[1]) {
      const text = riskMatch[1].toLowerCase();
      if (text.includes("alto") || text.includes("vermelho") || text.includes("high") || text.includes("🔴")) {
        riskLevel = "Alto";
      } else if (text.includes("médio") || text.includes("medio") || text.includes("medium") || text.includes("amarelo") || text.includes("🟡")) {
        riskLevel = "Médio";
      } else if (text.includes("baixo") || text.includes("low") || text.includes("verde") || text.includes("🟢")) {
        riskLevel = "Baixo";
      }
    }

    // Fallback if regex failed to capture but title starts with critical indicator
    if (title && (originalMatch || dangerMatch || draftMatch)) {
      clauses.push({
        id: `clause-${tempId++}`,
        title: title,
        originalClause: originalMatch ? originalMatch[1].trim() : "Texto indisponível.",
        riskLevel,
        dangerExplanation: dangerMatch ? dangerMatch[1].trim() : "Identificado risco contratual assimétrico nesta seção.",
        recommendedAction: actionMatch ? actionMatch[1].trim() : "Rever cláusula",
        suggestedDraft: draftMatch ? draftMatch[1].trim() : "Nova redação recomendada não especificada.",
        coreIssueSummary: coreIssueMatch ? coreIssueMatch[1].trim() : "Uma frase curta de impacto não pôde ser gerada.",
        relations: relationsMatch ? relationsMatch[1].trim() : "Sem referências ou modificações diretas identificadas.",
      });
    }
  }

  // Parse overall health score
  // Matches "Nota: 85/100" or "Saúde: 75" or numeric percentages
  const scoreMatch = markdown.match(/(?:nota\s*(?:geral|de)?\s*(?:saúde)?|saúde\s*(?:do\s*contrato)?)\s*(?:de)?\s*:?\s*(\d{1,3})/i) || 
                     markdown.match(/(\d{1,3})\s*\/\s*100/i) ||
                     markdown.match(/nota[^0-9]*(\d{1,3})/i);
  if (scoreMatch && scoreMatch[1]) {
    const val = parseInt(scoreMatch[1], 10);
    if (val >= 0 && val <= 100) {
      healthScore = val;
    }
  } else {
    // If no score was outputted, estimate based on risk counts
    if (clauses.length > 0) {
      const highCount = clauses.filter(c => c.riskLevel === "Alto").length;
      const mediumCount = clauses.filter(c => c.riskLevel === "Médio").length;
      const lowCount = clauses.filter(c => c.riskLevel === "Baixo").length;
      const score = 100 - (highCount * 18 + mediumCount * 8 + lowCount * 2);
      healthScore = Math.max(10, Math.min(95, score));
    }
  }

  // Parse verdict
  const verdictLower = markdown.toLowerCase();
  
  // High priorities
  if (
    verdictLower.includes("rejeitar e renegociar") || 
    verdictLower.includes("rejeitar") || 
    verdictLower.includes("não aprovar") || 
    verdictLower.includes("alto risco")
  ) {
    verdict = "Rejeitar e Renegociar";
    verdictDescription = "O contrato possui desequilíbrios gravíssimos de faturamento ou de multas. Recomenda-se não assinar a minuta na forma atual e contrapropor as redações de blindagem.";
  } else if (
    verdictLower.includes("ressalvas") || 
    verdictLower.includes("ressalva") || 
    verdictLower.includes("aprovar com ressalvas") ||
    verdictLower.includes("recomenda-se atenção")
  ) {
    verdict = "Aprovar com Ressalvas";
    verdictDescription = "O contrato apresenta riscos normais a moderados de mercado. É viável aprovar, contanto que as sugestões de blindagem propostas sejam incorporadas.";
  } else if (
    verdictLower.includes("aprovar") || 
    verdictLower.includes("aprovado") || 
    verdictLower.includes("equilibrado") || 
    verdictLower.includes("baixo risco")
  ) {
    verdict = "Aprovar";
    verdictDescription = "O documento encontra-se íntegro, equilibrado e em conformidade estrutural com os padrões contratuais de conformidade comercial.";
  }

  return {
    rawMarkdown: markdown,
    clauses,
    healthScore,
    verdict,
    verdictDescription,
  };
}
