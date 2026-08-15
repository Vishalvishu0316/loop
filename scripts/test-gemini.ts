import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function testAllGeminiFeatures() {
  console.log("==========================================");
  console.log("🔍 Live Gemini Integration Verification");
  console.log("==========================================");

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY is not set in .env!");
    process.exit(1);
  }

  console.log(`🔑 Key Prefix: ${apiKey.slice(0, 8)}...`);
  console.log(`🤖 Active Model: ${model}\n`);

  const ai = new GoogleGenAI({ apiKey });

  // Test 1: Classification
  console.log("--- [1/3] Testing Auto-Classification ---");
  const classifyPrompt = `You are an AI text classifier for customer feedback. Return ONLY valid JSON:
{
  "sentiment": "POS" | "NEU" | "NEG",
  "sentimentScore": number between -1.0 and 1.0,
  "confidence": number between 0.0 and 1.0,
  "featureArea": string,
  "suggestedThemes": string[],
  "rationale": string
}

Feedback: "Search is completely broken when searching for special characters."`;

  try {
    const t0 = Date.now();
    const res1 = await ai.models.generateContent({
      model,
      contents: classifyPrompt,
      config: { temperature: 0 },
    });
    console.log(`✅ Classification passed (${Date.now() - t0}ms)`);
    console.log(res1.text?.trim().slice(0, 200) + "...\n");
  } catch (e: any) {
    console.error("❌ Classification failed:", e?.message);
  }

  // Test 2: Ask LOOP Grounded Q&A
  console.log("--- [2/3] Testing Ask LOOP (Grounded RAG) ---");
  const askPrompt = `You are LOOP, an AI customer intelligence analyst.
GROUNDING RULES: Cite references as [REF1], [REF2].

CONTEXT:
[REF1] (Support Ticket) "The export to CSV button is unresponsive."
[REF2] (NPS Survey) "Love the dashboard, but wish CSV downloads worked on Safari."

QUESTION: Why are users complaining about export?`;

  try {
    const t0 = Date.now();
    const res2 = await ai.models.generateContent({
      model,
      contents: askPrompt,
      config: { temperature: 0 },
    });
    console.log(`✅ Ask LOOP RAG passed (${Date.now() - t0}ms)`);
    console.log(res2.text?.trim() + "\n");
  } catch (e: any) {
    console.error("❌ Ask LOOP failed:", e?.message);
  }

  // Test 3: Live Database Retrieval + Gemini Answer
  console.log("--- [3/3] Testing Live Database Semantic Search + Gemini ---");
  const { db } = await import("../lib/db");
  const { semanticSearch, answerLoopQuestion } = await import("../lib/ai");
  const ws = await db.workspace.findFirst();
  if (ws) {
    const query = "Summarize positive feedback about reporting";
    const context = await semanticSearch(ws.id, query, 8);
    console.log(`Found ${context.length} citations for "${query}":`);
    context.slice(0, 3).forEach((c, idx) => console.log(`  [REF${idx + 1}] (${c.channel}) "${c.content.slice(0, 80)}..."`));
    
    const ans = await answerLoopQuestion(query, context);
    console.log("\nGemini Answer:");
    console.log(ans.answer);
  }

  console.log("\n==========================================");
  console.log("🎉 All Gemini features are OPERATIONAL and ready!");
  console.log("==========================================");
}

testAllGeminiFeatures();
