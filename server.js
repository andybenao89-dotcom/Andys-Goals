import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const port = process.env.PORT || 3000;
const model = process.env.OPENAI_MODEL || "gpt-6-luna";
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function requireAI(res) {
  if (!client) {
    res.status(500).json({
      error: "OPENAI_API_KEY is not configured on the server."
    });
    return false;
  }
  return true;
}

async function ask(input) {
  const response = await client.responses.create({
    model,
    input
  });
  return response.output_text;
}

app.post("/api/ai/lesson", async (req, res) => {
  if (!requireAI(res)) return;
  try {
    const chapter = req.body.chapter || "Helicopter Fundamentals";
    const text = await ask(
      `You are Andy's aviation tutor. Teach a complete beginner in Traditional Chinese.
For important aviation terms, write English followed by Traditional Chinese in parentheses.
Teach general helicopter science, aerodynamics, systems, and safety only.
Do not provide military tactics, classified information, or operational procedures.
Create a clear lesson for: ${chapter}.
Include: learning objectives, explanation, key terms, one simple example, and 5 review questions.`
    );
    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/quiz", async (req, res) => {
  if (!requireAI(res)) return;
  try {
    const lesson = req.body.lesson || "Helicopter Fundamentals";
    const text = await ask(
      `Create 5 beginner helicopter quiz questions based only on this lesson.
Use Traditional Chinese. Mix multiple choice and short-answer questions.
Do not reveal the answers.
Lesson:
${lesson}`
    );
    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/tutor", async (req, res) => {
  if (!requireAI(res)) return;
  try {
    const message = req.body.message || "";
    const context = req.body.context || "";
    const text = await ask(
      `You are the AI Tutor inside Andy's Goals.
Answer in Traditional Chinese and teach clearly.
For important aviation terms, write English followed by Traditional Chinese in parentheses.
Context:
${context}

User question:
${message}`
    );
    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/spanish-day", async (req, res) => {
  if (!requireAI(res)) return;
  try {
    const day = req.body.day || 1;
    const learned = req.body.learned || [];
    const text = await ask(
      `You are a Spanish teacher for a complete beginner.
Generate exactly 10 useful Spanish words or phrases for Day ${day}.
Avoid these already learned items:
${JSON.stringify(learned)}

For each item provide:
1. Spanish
2. Simple pronunciation
3. Traditional Chinese meaning
4. One simple Spanish example sentence
5. Traditional Chinese translation

End with 5 quick review questions.`
    );
    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true, name: "Andy’s Goals" });
});

app.listen(port, () => {
  console.log(`Andy’s Goals running on port ${port}`);
});
