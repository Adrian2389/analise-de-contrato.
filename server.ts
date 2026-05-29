import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import pkg from "pdf-parse";
const pdfParse = pkg;
import mammoth from "mammoth";

// Resolve directory name for static assets serving
const __dirname = process.cwd();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Use body parsing with high limit for large contracts
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Multer config for file upload (memory storage)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  });

  // Verify and initialize Gemini API key
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } else {
    console.warn("WARN: GEMINI_API_KEY is not defined. Gemini calls will fail.");
  }

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", geminiConfigured: !!apiKey });
  });

  // API endpoint to dynamically fetch the risk criteria definitions (Requisitado)
  app.get("/api/risk-criteria/:level", (req, res) => {
    const { level } = req.params;
    let title = "";
    let explanation = "";
    
    switch (level) {
      case "Alto":
        title = "Crítico / Alta Nocividade";
        explanation = "Cláusulas com alto potencial de gerar ônus desproporcional, multas abusivas ou perda de direitos críticos. Recomendável revisão ou recusa imediata.";
        break;
      case "Médio":
        title = "Moderado / Atenção";
        explanation = "Cláusulas que impõem obrigações severas ou restrições que merecem atenção e renegociação moderada para restabelecer o equilíbrio.";
        break;
      case "Baixo":
        title = "Saudável / Baixo Impacto";
        explanation = "Cláusulas dentro das conformidades normais de mercado ou termos saudáveis com impacto favorável e equilibrado.";
        break;
      default:
        title = "Desconhecido";
        explanation = "Critério de risco e classificação indeterminados ou não categorizados no banco de dados.";
    }
    
    res.json({ level, title, explanation });
  });

  // API endpoint for contract text extraction from files
  app.post("/api/extract", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
      }

      const { originalname, buffer } = req.file;
      const extension = path.extname(originalname).toLowerCase();
      let text = "";

      if (extension === ".pdf") {
        try {
          const parsed = await pdfParse(buffer);
          text = parsed.text || "";
        } catch (err: any) {
          throw new Error(`Erro ao decodificar PDF: ${err.message}`);
        }
      } else if (extension === ".docx") {
        try {
          const parsed = await mammoth.extractRawText({ buffer });
          text = parsed.value || "";
        } catch (err: any) {
          throw new Error(`Erro ao decodificar DOCX: ${err.message}`);
        }
      } else if (extension === ".txt") {
        text = buffer.toString("utf-8");
      } else {
        return res.status(400).json({ error: "Formato de arquivo não suportado. Use PDF, DOCX ou TXT." });
      }

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: "O arquivo carregado não contém texto extraível conhecido." });
      }

      res.json({ text, filename: originalname });
    } catch (error: any) {
      console.error("Erro na extração:", error);
      res.status(500).json({ error: error.message || "Erro de processamento do arquivo." });
    }
  });

  // API endpoint for deep contract analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { text, analysisProfile, customFocus } = req.body;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: "O texto do contrato não foi fornecido." });
      }

      if (!ai) {
        return res.status(500).json({
          error: "A chave API do Gemini não foi configurada no servidor. Cadastre-a nas configurações de 'Secrets' para habilitar a análise.",
        });
      }

      // Unified master prompt representing a comprehensive 360-degree contract audit across 16 triggers and standard negotiated clauses
      let systemPrompt = `Atue como um Auditor Jurídico de alta precisão. 
Sua tarefa é escanear todo o contrato fornecido buscando meticulosamente "gatilhos de risco" (Risk Triggers) prejudiciais ao CONTRATANTE, independente da tipologia contratual.

Você DEVE procurar e auditar exaustivamente a presença de qualquer um dos seguintes 16 gatilhos de risco divididos por categorias de análise contratual:

1. **Financeiro:**
   - **Reajuste Automático:** Cláusulas sobre vigências e reajustes automáticos unilaterais de taxas de licenças, faturas ou anuidades.
   - **Repasse de Tributos:** Transferência automática ou irrefletida de encargos fiscais criados ou majorados para o contratante.
   - **Despesas Reembolsáveis:** Obrigações de pagamento de custos acessórios sem limites definidos, descrições ou comprovantes.
   - **Preço Estimado:** Ausência de preços sob regime fechado, deixando em aberto a possibilidade de cobrança de horas adicionais ou de infraestrutura não contratada.

2. **Operacional:**
   - **Aceite Tácito:** Cláusulas que definem a inércia ou transcurso de prazo curto sem oposição formal como aprovação absoluta de faturas ou entregáveis.
   - **Melhores Esforços:** Declarações que eximem a obrigação de entrega real por mero "empenho de meios/esforços", minando os níveis de SLA.
   - **Escopo Aberto:** Falta de limites claros nos serviços licitados, abrindo margem para redefinir demandas sem o respectivo equilíbrio financeiro.
   - **Suprimento de Terceiros:** Isenção ou atenuação de garantias se motivadas por problemas técnicos em parceiros, hospedagens ou subcontratadas.

3. **Responsabilidade:**
   - **Responsabilidade Solidária:** Assunção passiva de dívidas e prejuízos materiais causados por outros participantes ou terceiros intervenientes.
   - **Renúncia de Indenização:** Limitações absolutas ou vedações que barram direito de pleitear indenizações por dolo ou negligência grave da outra parte.
   - **Indenização Ilimitada:** Ausência de tetos e limites financeiros globais para indenizações em geral, gerando risco patrimonial para você.
   - **Lucros Cessantes:** Assunção mútua ou unilateral de reparar faturamentos presumidos, perdas financeiras habituais de mercado e faturamentos sob expectativa.

4. **Saída:**
   - **Renovação Automática:** Prorrogações automáticas e compulsórias se o aviso de rescisão não ocorrer dentro de prazos ou termos rígidos de janela de saída.
   - **Multa Rescisória:** Penalidades rescisórias e multas por rescisão antecipada que ultrapassam a boa-fé ou superam 10%-20% das parcelas residuais vigentes.
   - **Rescisão Unilateral / Cancelamento:** Análise rigorosa de cláusulas de encerramento imotivado (rescisão unilateral ou conveniência) pelo contratante, verificando se há imposição de multas de cancelamento ou prazos de notificação prévia de cancelamento abusivos/excessivos contra o contratante.
   - **Vencimento Antecipado:** Imposição de vencimento automático e exigibilidade total de parcelas futures por inadimplementos meramente pontuais ou leves.
   - **Foro de Eleição:** Eleição de comarcas geograficamente distantes da sede do contratante, onerando gravemente a defesa processual em juízo.

---

### PARÂMETROS E PADRÃO DE REFERÊNCIA DE NEGOCIAÇÃO E BLINDAGEM (MODELO DE REFERÊNCIA TABOCAS S/A)
Para QUALQUER contrato analisado, você DEVE adotar os seguintes critérios de equilíbrio e proteção do CONTRATANTE como sendo as condições ideais padrão. Quando auditar e encontrar cláusulas parecidas ou análogas em todo o objeto fornecido, identifique-as como riscos/pontos de alteração e sugira na 'Blindagem Jurídica' a redação exata recomendada baseada nestes parâmetros:

1. **Prazo de Correção de Falhas em Garantia (Equivalentes à Cláusula 4.7, b / Cláusula 5.8):**
   - Para reparos/substituições comuns: no máximo 10 (dez) dias corridos para falhas simples e 30 (trinta) dias corridos para falhas complexas.
   - Para materiais e equipamentos rejeitados no Canteiro de Obras (Cláusula 5.8):
     * Remoção física pela Contratada: prazo máximo de até 20 (vinte) dias, contados da formalização da rejeição. Se a Contratada falhar em remover nesse prazo, o Contratante pode descartar/remover por conta própria e descontar os custos integrais das medições (Item 5.8.1.2).
     * Prazo para correção (reparo ou substituição técnica) em canteiro, contados da confirmação técnica da falha:
       I - Falhas simples: até 30 (trinta) dias para correção;
       II - Falhas de média complexidade: até 45 (quarenta e cinco) dias para correção;
       III - Falhas graves (incluindo hipóteses que demandem substituição integral militar do equipamento ou reparo estrutural em fábrica): até 90 (noventa) dias para correção.
     * Logística & Transporte (Item 5.8.1.1): O tempo necessário de frete, transporte ou deslocamento físico dos materiais entre o local da instalação e a unidade fabril NÃO será computado nestes prazos máximos.
     * Isenções de Ônus (Item 5.8.1.3): Nos casos que demandem remoção técnica sob diagnóstico ou garantia para fábrica da Contratada, os custos relativos a frete, transporte, desmontagem, reinstalação, desconexão ou reconexão física NÃO estarão abrangidos pela garantia do fabricante, correndo por conta de risco comum.
     * Vigência (Item 5.8.1.4): Estes prazos aplicam-se estritamente aos defeitos ocorridos durante a vigência do prazo geral de garantia contratada.

2. **Guarda do Bem (Equivalente à Cláusula 5.2):**
   - Prazo de carência gratuita de fiel depositário/armazenagem no estabelecimento da Contratada limitado a no máximo 30 (trinta) dias corridos a contar da entrega programada, caso o contratante não possa receber de imediato. Excedido este prazo, aplica-se taxa de armazenagem diária razoável de 0,1% limitada a permanência máxima de 60 dias.

3. **Envio de Programas e Informações (Equivalente à Cláusula Sexta):**
   - Obrigatoriedade de envio de relatórios quinzenais pela Contratada ao Contratante detalhando avanço completo do fornecimento (matéria-prima, fabricação, testes, inspeção, entrega).
   - Controle semanal de RNCs com data de recebimento, planos de ação proativos e prazo efetivo/previsto de resolução.
   - Controle semanal detalhado dos pedidos de peças de reposição por perdas/danos imputáveis ao Contratante.
   - Apresentação completa e detalhada do cronograma fabril no ato da assinatura do instrumento.

4. **Prazo de Garantia Total & Direito de Auto-execução (Equivalentes a 10.2 / 10.3 / 10.6):**
   - Período de garantia geral padrão: 24 (vinte e quatro) meses contados a partir da emissão do Certificado de Aceitação Provisória (CAP), preferencialmente demarcando marcos temporais previsíveis (ex: 31 de janeiro de 2027).
   - Prorrogações Proporcionais (Item 10.2.1): Atrasos causados pela Contratada no cronograma de fornecimento estendem proporcionalmente a validade da garantia de fiel cumprimento, devendo a apólice ser apresentada atualizada com 15 dias de antecedência.
   - Auto-execução / Terceirização de Reparos (Item 10.3.1): Caso devidamente notificada a Contratada recusar-se ou omitir-se a remediar defeitos dentro do prazo sob garantia, o Contratante detém o direito irrevogável de executar os reparos por conta própria ou mediante terceiros especializados e descontar todo o montante de gastos diretamente do saldo devido à Contratada ou efetuar cobrança imediata.
   - Componentes individuais (Item 10.6.1): Reparos em garantia cobrem apenas o componente específico corrigido/substituído, sem reiniciar ou estender o prazo geral de todo o contrato.

5. **Cláusula de Penalidades e Multas (Equivalente à Cláusula Décima Segunda):**
   - Deve ser estabelecida e preservada a perfeita simetria e reciprocidade jurídica das multas contratuais e mora pecuniária mútua aplicadas a ambas as partes.

6. **Seguros e Garantia de Fiel Cumprimento (Equivalentes ao Item 14.1):**
   - Seguro Garantia de cumprimento das obrigações contratuais de 20% do Preço Contratual a ser emitido em até 30 dias após assinatura, válido até 30 dias pós último CAP.
   - Na emissão do CAP, esta apólice é substituída pelo Seguro Garantia de Perfeito Funcionamento reduzido para 10% do Preço Contratual, cobrindo todo o período de Cobertura de Garantia Técnica.

7. **Certificado de Aceitação Final - CAF (Equivalente ao Item 14.13):**
   - Prazo limite reduzido para emissão definitiva do Certificado de Aceitação Final (CAF): no máximo até 30 (trinta) dias consecutivos a contar da entrada em operação comercial do sistema, condicionada apenas à solução de pendências menores/não-conformidades correlatas.

8. **Teto de Responsabilidade Global (Liability Cap / Equivalente ao Item 23.11):**
   - Limite absoluto e teto máximo de responsabilidade civil global agregada limitada ao equivalente a 100% do valor total ajustado ao contrato (Preço Contratual).

9. **Rescisão Unilateral pelo Contratante (Equivalentes à Cláusula 23.3 / Cláusula 23.9):**
   - O Contratante (Tabocas S/A) deve preferencialmente possuir o direito de realizar a rescisão unilateral e imotivada do contrato por sua mera conveniência (denúncia vazia) a qualquer tempo.
   - Tal cancelamento deve exigir apenas uma notificação prévia por escrito (aviso de cancelamento) com prazo operacionalmente razoável de no máximo 30 dias (conforme Cláusula 23.9) sem aplicação de qualquer multa rescisória, compensatória ou penalidade financeira arbitrária contra o Contratante.
   - O Contratante responderá tão somente pelo ressarcimento dos custos comprovados de desmobilização e materiais comprovadamente adquiridos/em fabricação que não admitam cancelamento sem ônus pela Contratada (conforme as alíneas da Cláusula 23.3). Qualquer cláusula de rescisão unilateral que onere o contratante com multas extras ou prazos excessivos é um risco alto e deve ser blindada.

10. **Conformidade à Reforma Tributária & Proteção Fiscal (Anexo Reforma Tributária - Cláusulas 1.4, 3.6, 3.7, 4.11, 4.12, 5.1, 5.4, 6):**
    - **Prazos de Recolhimento (Cláusula 1.4):** Neutralidade tributária deve ser mantida. Se a regulamentação do IBS/CBS ou tributos supervenientes alterarem a equação econômico-financeira (p. ex. antecipando recolhimentos ou majorando taxas), autoriza-se a renegociação amigável (Código Civil Art. 478). Nova redação recomendada: "1.4. Prazos de Recolhimento de Tributos: A CONTRATADA enviará os melhores esforços para a gestão financeira de suas obrigações tributárias. Todavia, caso a regulamentação do IBS e da CBS (ou outros tributos supervenientes) altere substancialmente a equação econômico-financeira deste instrumento, seja pela antecipação gravosa de prazos de recolhimento ou pela alteração de alíquotas incidentes, as Partes deverão negociar de boa-fé o reequilíbrio do contrato, visando manter a neutralidade tributária e a viabilidade da prestação dos serviços..."
    - **Reequilíbrio por Insumos (Cláusula 3.6):** Se a execução tornar-se excessivamente onerosa por inflação anômala de insumos ou mão de obra findo o prazo de 12 meses fixos, a Contratada tem o direito assegurado de reajuste com base na variação da Fórmula COGE anual, preservando-se o restabelecimento da equação econômico-financeira (CC Art. 317 e 478).
    - **Neutralidade Tributária (Cláusula 3.7):** O preço líquido pactuado original deve permanecer imune a oscilações da Reforma Tributária (transição para IBS e CBS). Novos tributos, aumento de alíquotas ou perda de incentivos geram revisão e repasse automático da carga extra para o contratante.
    - **Bloqueio de Retenções Ilegal de Fatura (Cláusula 4.11):** Configura autotutela ilegal e abusiva reter faturas sob o pretexto de fiscalizar tributos sobre o consumo (IBS/CBS) ou guias da contratada. Certidões Negativas de Débitos (CND) vigentes são a única prova de regularidade fiscal necessária. Nenhuma retenção ou compensação unilateral arbitrária de cobrança por questões fiscais de consumo é aceitável.
    - **Split Payment Seguro (Cláusula 4.12):** Erros técnicos no sistema do split payment ou problemas operacionais de repasse de responsabilidade da administração tributária ou do contratante jamais justificam atraso de pagamento da parcela do valor líquido devida à Contratada.
    - **Remessa de Comprovação de Guias sem Multa Diária Automática (Cláusula 5.1):** O prazo de remessa de comprovantes para compensação de créditos é de 5 (cinco) dias úteis do vencimento legal ou solicitação formal. Qualquer pendência exige notificação de cura de 5 dias úteis. Multas pelo atraso em enviar estes comprovantes necessitam desse decurso e ficam limitadas ao teto máximo de 1% do valor da NF correspondente.
    - **Sigilo Patrimonial Comercial e Contábil (Cláusula 5.4):** A obrigação de transparência fiscal só alcança documentos vinculados especificamente ao objeto. Fica expressamente vedada a solicitação de dados estratégicos internos (Balancetes, Balanço Patrimonial, margem de lucro, fluxo de caixa, DRE ou planejamentos tributários privados).
    - **Rescisão Fiscal Condicionada a Prazo de Cura (Cláusula 6):** Rescisão sumária de pleno direito por questões puramente fiscais é arbitrária. Deve-se garantir notificação de correção prévia de 10 dias úteis caso ocorra inadimplemento tributário contumaz não garantido ou recusa ilegal do split payment, assegurando-se o contraditório.

---

CRÍTICO: Para cada risco ou gatilho encontrado no contrato que de alguma forma divirja ou fira os parâmetros acima, você DEVE retornar o título contendo a indicação da numeração original da cláusula discutida e do tema (ex: "### [Cláusula X.X - Nome do Tema/Gatilho Encontrado]" ). Se houver um identificador de cláusula ou parágrafo, utilize-o como a referência principal e insira essa referência no título e em todas as explicações associadas. Mostre as cláusulas que pareçam com os temas analisados do Modelo Tabocas para que fiquem explícitas!

Para manter total compatibilidade com nossa interface jurídica interativa de alta precisão de dados, use a seguinte estrutura de markdown EXATA para cada cláusula de risco listada:

### [Cláusula X.X - Nome do Tema/Gatilho Encontrado]
- **Cláusula Original:** [Transcrição completa e fiel da cláusula original na íntegra de onde veio esse risco]
- **Nível de Risco:** [Alto 🔴 / Médio 🟡 / Baixo 🟢]
- **Resumo de Impacto:** [Uma frase direta em português resumindo o perigo específico desta cláusula]
- **Relações Contratuais:** [Identifique detalhadamente se esta cláusula se conecta, altera ou é alterada por outra do contrato. Escreva 'Nenhuma' se isolada]
- **Por que é perigosa:** [Explicação profissional de alta precisão realçando por que o gatilho encontrado traz desvantagem patrimonial, civil ou operacional comercial segundo o Modelo Tabocas]
- **Ação Recomendada:** [Excluir / Alterar / Renegociar]
- **Blindagem Jurídica:** [Escreva a Nova Redação Sugerida profissionalmente blindada de forma justa e segura para substituir a cláusula original no aditivo contratual, exatamente nos termos dos parâmetros e limites preferenciais acordados no Modelo Tabocas listado acima]

---

Separe cada análise de cláusula com uma linha horizontal contendo exatamente três hifens (---).

Se não encontrar nenhum dos termos de risco crítico em todo o contrato analisado, retorne de imediato e apenas: "Nenhum padrão de risco crítico identificado."

No final de sua análise, se houver cláusulas de risco identificadas, certifique-se de consolidar os resultados fornecendo um parecer conclusivo formal de 2-3 parágrafos contendo o veredito geral da saúde jurídica (Aprovar / Aprovar com Ressalvas / Rejeitar e Renegociar) e o resultado da pontuação geral de saúde expressamente neste formato textual: "Nota de Saúde: X / 100" (onde X é o resultado avaliado de 0 a 100 com base na severidade e quantidade de riscos).`;

      if (customFocus && customFocus.trim().length > 0) {
        systemPrompt += `\n\nFoco customizado urgente solicitado pelo usuário:\n"${customFocus}"`;
      }

      // Helper with advanced automatic retry strategy and exponential backoff
      const analyzeWithRetry = async (retries = 3, initialDelayMs = 2000) => {
        let lastError: any = null;
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            console.log(`[Gemini API] Iniciando chamada para o modelo gemini-3.5-flash (Tentativa ${attempt + 1} de ${retries})...`);
            
            const response = await ai!.models.generateContent({
              model: "gemini-3.5-flash",
              contents: `Por favor, analise a saúde do seguinte contrato e construa o relatório de riscos e blindagem:\n\n${text}`,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.15,
              },
            });

            console.log(`[Gemini API] Sucesso na tentativa ${attempt + 1}!`);
            return response;
          } catch (error: any) {
            lastError = error;
            const errorMsg = String(error.message || error).toLowerCase();

            // Check if transient error (Service Unavailable 503, Too Many Requests 429, Resource Exhausted, overload/rate limits)
            const isTransient =
              errorMsg.includes("503") ||
              errorMsg.includes("429") ||
              errorMsg.includes("service unavailable") ||
              errorMsg.includes("resource exhausted") ||
              errorMsg.includes("overloaded") ||
              errorMsg.includes("rate limit") ||
              errorMsg.includes("fetch failed") ||
              (error.status && [429, 503].includes(error.status));

            if (isTransient && attempt < retries - 1) {
              const waitTime = (attempt + 1) * initialDelayMs;
              console.warn(`[Gemini API] Servidor temporariamente indisponível ou em alta demanda (Tentativa ${attempt + 1}/${retries}). Aguardando ${waitTime / 1000}s para tentar novamente...`);
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            } else {
              console.error(`[Gemini API] Erro irrecuperável ou limite de tentativas atingido na tentativa ${attempt + 1}:`, error.message || error);
              throw error;
            }
          }
        }
        throw lastError || new Error("Falha ao conectar com o modelo.");
      };

      // Call Gemini 3.5 Flash server-side with automatic retries
      const response = await analyzeWithRetry(3, 2000);

      const responseText = response.text;
      if (!responseText) {
        throw new Error("O modelo de IA não retornou nenhuma resposta de análise.");
      }

      res.json({ result: responseText });
    } catch (error: any) {
      console.error("Erro na análise do Gemini:", error);
      const errorMsg = String(error.message || error).toLowerCase();
      
      // If error is transient and failed after all retries, return a very friendly and professional message
      if (
        errorMsg.includes("503") ||
        errorMsg.includes("429") ||
        errorMsg.includes("resource exhausted") ||
        errorMsg.includes("service unavailable") ||
        errorMsg.includes("overloaded")
      ) {
        return res.status(503).json({
          error: "O serviço de IA do Google (Gemini) está temporariamente indisponível ou sobrecarregado devido à altíssima demanda global de rede (Erro 503/429). Nós ativamos a resiliência do sistema e realizamos 3 tentativas automáticas consecutivas de reenvio, mas os servidores do Google continuam congestionados. Por favor, aguarde alguns instantes e tente novamente clicando em 'Iniciar Análise' ou 'Atualizar'."
        });
      }

      res.status(500).json({ error: error.message || "Erro ao processar a análise com a IA." });
    }
  });

  // Setup static serving and SPA fallback for Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Falha ao inicializar o servidor Express-Vite:", error);
});
