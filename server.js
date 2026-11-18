import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
const __filename=fileURLToPath(import.meta.url), __dirname=path.dirname(__filename);
const app=express(); app.use(express.json({limit:"2mb"})); app.use(express.static(__dirname));
const port=process.env.PORT||3000, model=process.env.OPENAI_MODEL||"gpt-6-luna";
const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
function requireAI(res){if(!client){res.status(500).json({error:"OPENAI_API_KEY is not configured on the server."});return false}return true}
async function ask(input){const r=await client.responses.create({model,input});return r.output_text||""}
function parseJSON(raw){const s=raw.replace(/```json/gi,"").replace(/```/g,"").trim(),a=s.indexOf("{"),b=s.lastIndexOf("}");if(a<0||b<a)throw Error("AI 回傳格式不正確。");return JSON.parse(s.slice(a,b+1))}
app.post("/api/ai/tutor",async(req,res)=>{if(!requireAI(res))return;try{res.json({text:await ask(`You are the AI Tutor inside Andy's Goals. Answer in Traditional Chinese. Use only general aviation education and the supplied study context. Do not provide military tactics, operational procedures, or classified information.\nContext:\n${req.body.context||""}\nQuestion:\n${req.body.message||""}`)})}catch(e){res.status(500).json({error:e.message})}});
app.post("/api/ai/quiz",async(req,res)=>{if(!requireAI(res))return;try{const raw=await ask(`Create a study quiz using ONLY these supplied flashcards. Do not invent facts. Use Traditional Chinese. Create exactly 5 questions: 3 multiple choice and 2 short answer. Prioritize weak areas. Return ONLY JSON with title,instructions,questions. Each MCQ needs options and exact answer; each short answer needs key points and explanation.\nFLASHCARDS:\n${JSON.stringify(req.body.cards||[])}\nWEAK AREAS:\n${JSON.stringify(req.body.weakAreas||[])}`);const quiz=parseJSON(raw);if(!Array.isArray(quiz.questions)||quiz.questions.length!==5)throw Error("題目格式不完整。");res.json({quiz})}catch(e){res.status(500).json({error:e.message})}});
app.post("/api/ai/grade",async(req,res)=>{if(!requireAI(res))return;try{const raw=await ask(`Grade the student's answers using ONLY this quiz answer key. Return ONLY JSON: {"results":[{"id":"q1","correct":true,"correctAnswer":"...","explanation":"...","feedback":"..."}],"weakAreas":["..."]}. For short answers accept equivalent wording when the key concept is correct. QUIZ:${JSON.stringify(req.body.quiz)} ANSWERS:${JSON.stringify(req.body.answers||[])}`);const g=parseJSON(raw),map=new Map((g.results||[]).map(x=>[x.id,x]));const results=req.body.quiz.questions.map(q=>{const x=map.get(q.id)||{};return{id:q.id,correct:Boolean(x.correct),correctAnswer:x.correctAnswer||q.answer,explanation:x.explanation||q.explanation,feedback:x.feedback||"請複習這張字卡。"}});const score=results.filter(x=>x.correct).length;res.json({score,total:results.length,percentage:Math.round(score/results.length*100),results,weakAreas:[...new Set([...(g.weakAreas||[]),...req.body.quiz.questions.filter((q,i)=>!results[i].correct).map(q=>q.concept)])]})}catch(e){res.status(500).json({error:e.message})}});
app.get("/health",(req,res)=>res.json({ok:true,name:"Andy’s Goals"}));
app.listen(port,()=>console.log(`Andy’s Goals running on port ${port}`));
