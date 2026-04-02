import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { LEGAL_LIBRARY } from "../data/legalLibrary.js";
import { retrieveStatutesForBill } from "./retrieval.js";

/**
 * LangChain retriever over the curated legal library (keyword / CPT-prefix scoring).
 */
export class LegalLibraryRetriever extends BaseRetriever {
  constructor(fields = {}) {
    super(fields);
    this.k = fields.k ?? 20;
  }

  lc_namespace = ["statutebill", "retrievers"];

  async _getRelevantDocuments(query) {
    let parsed;
    try {
      parsed = JSON.parse(query);
    } catch {
      parsed = { facilityName: String(query || ""), lineItems: [] };
    }
    const clauses = retrieveStatutesForBill(parsed, this.k);
    return clauses.map(
      (c) =>
        new Document({
          pageContent: `[${c.id}] ${c.topic}\nReference: ${c.reference}\n${c.excerpt}`,
          metadata: { id: c.id, topic: c.topic, reference: c.reference }
        })
    );
  }
}

const billToQuery = RunnableLambda.from((parsed) => JSON.stringify(parsed ?? {}));

/**
 * RAG step: bill JSON → ranked legal Documents (runs before deterministic audit).
 */
export async function runBillRag(parsed, k = 20) {
  const retriever = new LegalLibraryRetriever({ k });
  const chain = RunnableSequence.from([billToQuery, retriever]);
  return chain.invoke(parsed);
}

export function clauseEntriesFromDocuments(docs) {
  const seen = new Set();
  const out = [];
  for (const d of docs || []) {
    const id = d.metadata?.id;
    if (!id || seen.has(id)) continue;
    const entry = LEGAL_LIBRARY.find((e) => e.id === id);
    if (entry) {
      seen.add(id);
      out.push(entry);
    }
  }
  return out;
}

export function ragContextFromDocuments(docs) {
  return (docs || []).map((d) => d.pageContent).join("\n\n---\n\n");
}
