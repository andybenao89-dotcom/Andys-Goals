import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

const port = process.env.PORT || 3000;
const model = process.env.OPENAI_MODEL || "gpt-6-luna";
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function requireAI(res) {
  if (!client) {
    res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    return false;
  }
  return true;
}

async function ask(prompt) {
  const response = await client.responses.create({ model, input: prompt });
  return response.output_text || "";
}

function parseJSON(raw) {
  const cleaned = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI 回傳格式不正確，請再試一次。");
  return JSON.parse(cleaned.slice(start, end + 1));
}

app.post("/api/ai/lesson", async (req, res) => {
  if (!requireAI(res)) return;
  try {
    const chapter = req.body.chapter || "Helicopter Fundamentals";
    const text = await ask(`You are Andy's aviation tutor. Teach a complete beginner in Traditional Chinese.
For important aviation terms, write English followed by Traditional Chinese in parentheses.
Teach general helicopter science, aerodynamics, systems, and safety only. Do not provide military tactics, classified information, or operational procedures.
Create a clear lesson for: ${chapter}.
Include: learning objectives, explanation, key terms, one simple example, and 5 review questions.`);
    res.json({ text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/ai/quiz", async (req, res) => {
  if (!requireAI(res)) return;
  try {
    const { topic = "Helicopter Fundamentals", lesson = "", weakAreas = [], mode = "heli" } = req.body;
    const languageRules = mode === "spanish"
      ? "Use Traditional Chinese instructions and Spanish examples. Test beginner Spanish vocabulary and basic phrases."
      : "Use Traditional Chinese. Important aviation terms must show English followed by Traditional Chinese in parentheses. Only general aviation science, systems, aerodynamics, and safety.";
    const raw = await ask(`Create a useful beginner quiz for Andy's Goals.
Topic: ${topic}
Lesson material: ${lesson || "Use the topic and standard beginner knowledge."}
Weak areas to reinforce: ${JSON.stringify(weakAreas)}
${languageRules}
Create exactly 5 questions: 3 multiple choice and 2 short answer.
Return ONLY valid JSON, no markdown, with this schema:
{
 "title":"quiz title",
 "instructions":"brief instructions",
 "questions":[
  {"id":"q1","type":"mcq","concept":"concept name","question":"question","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"exact correct option text","explanation":"clear explanation"},
  {"id":"q4","type":"short","concept":"concept name","question":"question","answer":"expected answer and acceptable key points","explanation":"grading explanation"}
 ]
}
Make questions unambiguous, answers factually correct, and explanations educational.`);
    const quiz = parseJSON(raw);
    if (!Array.isArray(quiz.questions) || quiz.questions.length !== 5) throw new Error("題目格式不完整，請重新生成。");
    res.json({ quiz });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/ai/grade", async (req, res) => {
  if (!requireAI(res)) return;
  try {
    const { quiz, answers = [] } = req.body;
    if (!quiz || !Array.isArray(quiz.questions)) return res.status(400).json({ error: "缺少測驗資料。" });

    const gradingPrompt = `You are a careful, fair teacher. Grade the student's answers using the supplied quiz answer key.
Return ONLY valid JSON:
{"results":[{"id":"q1","correct":true,"correctAnswer":"...","explanation":"...","feedback":"..."}],"weakAreas":["concept name"]}
Rules: MCQ must match the correct option. For short answers, accept equivalent wording and correct key points; do not require exact phrasing. Mark partially correct short answers false unless the core requested idea is present. Keep feedback concise in Traditional Chinese.
QUIZ: ${JSON.stringify(quiz)}
STUDENT ANSWERS: ${JSON.stringify(answers)}`;
    const raw = await ask(gradingPrompt);
    const graded = parseJSON(raw);
    const resultMap = new Map((graded.results || []).map(r => [r.id, r]));
    const results = quiz.questions.map(q => {
      const r = resultMap.get(q.id) || {};
      return {
        id: q.id,
        correct: Boolean(r.correct),
        correctAnswer: r.correctAnswer || q.answer,
        explanation: r.explanation || q.explanation,
        feedback: r.feedback || (r.correct ? "答對了！" : "再複習這個觀念。")
      };
    });
    const score = results.filter(r => r.correct).length;
    const weakAreas = [...new Set([
      ...(graded.weakAreas || []),
      ...quiz.questions.filter((q, i) => !results[i].correct).map(q => q.concept || q.question)
    ])];
    res.json({ score, total: results.length, percentage: Math.round(score / results.length * 100), results, weakAreas });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/ai/tutor", async (req, res) => {
  if (!requireAI(res)) return;
  try {
    const message = req.body.message || "";
    const context = req.body.context || "";
    const text = await ask(`You are the AI Tutor inside Andy's Goals. Answer in Traditional Chinese and teach clearly.
For important aviation terms, write English followed by Traditional Chinese in parentheses.
Context: ${context}
User question: ${message}`);
    res.json({ text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/ai/spanish-day", async (req, res) => {
  if (!requireAI(res)) return;
  try {
    const day = req.body.day || 1;
    const learned = req.body.learned || [];
    const text = await ask(`You are a Spanish teacher for a complete beginner. Generate exactly 10 useful Spanish words or phrases for Day ${day}.
Avoid these already learned items: ${JSON.stringify(learned)}
For each item provide Spanish, simple pronunciation, Traditional Chinese meaning, one simple Spanish example sentence, and Traditional Chinese translation.
End with 5 quick review questions.`);
    res.json({ text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/health", (req, res) => res.json({ ok: true, name: "Andy’s Goals" }));
app.listen(port, () => console.log(`Andy’s Goals running on port ${port}`));
