require('dotenv').config();
const express = require('express');
const path = require('path');
const OpenAI = require('openai');
const app = express();
app.use(express.json({limit:'2mb'}));
app.use(express.static(path.join(__dirname)));
const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
const MODEL = process.env.OPENAI_MODEL || 'gpt-6-luna';
app.get('/health',(req,res)=>res.json({ok:true}));
app.post('/api/ai/mcq', async (req,res)=>{
  try{
    const {question,answer} = req.body||{};
    if(!question||!answer) return res.status(400).json({error:'缺少題目或固定答案'});
    const prompt=`你是航空學習測驗編題助教。繁體中文。固定正確答案不可修改、不可縮短成不同意思。請為下面固定題目製作4個選項，其中只有1個正確，其餘3個是合理但錯誤的干擾選項。回傳JSON：{"options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}。不要加入作戰、戰術或敏感軍事操作資訊。\n題目：${question}\n固定正確答案：${answer}`;
    const r=await client.responses.create({model:MODEL,input:prompt});
    const raw=r.output_text||'';
    const match=raw.match(/\{[\s\S]*\}/);
    if(!match) throw new Error('bad json');
    const data=JSON.parse(match[0]);
    if(!Array.isArray(data.options)||data.options.length!==4||typeof data.correctIndex!=='number') throw new Error('invalid options');
    res.json(data);
  }catch(e){res.status(500).json({error:'選項生成失敗，請改用簡答模式。'});}
});
app.post('/api/ai/grade', async (req,res)=>{
  try{
    const {question,answer,studentAnswer} = req.body||{};
    if(!question||!answer||studentAnswer==null) return res.status(400).json({error:'缺少資料'});
    const prompt=`你是嚴謹的航空口試學習助教。請依「固定標準答案」判斷學生簡答是否達到核心重點。不要要求逐字相同；數字、單位、時間限制、關鍵名詞錯誤要判錯。回傳JSON：{"correct":true,"score":100,"feedback":"...","correctAnswer":"..."}。繁體中文。\n題目：${question}\n固定標準答案：${answer}\n學生答案：${studentAnswer}`;
    const r=await client.responses.create({model:MODEL,input:prompt});
    const match=(r.output_text||'').match(/\{[\s\S]*\}/);
    if(!match) throw new Error('bad json');
    res.json(JSON.parse(match[0]));
  }catch(e){res.status(500).json({error:'評分失敗，請翻卡查看固定答案。'});}
});
app.listen(process.env.PORT||3000,()=>console.log('Andys Goals v7 running'));
