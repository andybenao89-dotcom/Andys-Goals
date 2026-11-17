const chapters = [
  "Helicopter Fundamentals", "The Four Forces", "Rotor Blades & Airfoils",
  "How a Helicopter Generates Lift", "Cyclic", "Collective", "Anti-torque System",
  "Swashplate", "Rotor Disc", "Angle of Attack", "Translational Lift", "Ground Effect",
  "Dissymmetry of Lift", "Retreating Blade Stall", "Autorotation", "Turboshaft Engine",
  "Transmission", "Main Rotor System", "Tail Rotor System"
];

const chapterSelect = document.querySelector("#chapter");
chapters.forEach((chapter, index) => chapterSelect.add(new Option(`${index + 1}. ${chapter}`, chapter)));

let lastLesson = "";
let currentQuizzes = { heli: null, spanish: null };

function showPage(id) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.querySelector(`#${id}`).classList.add("active");
}
async function postJSON(url, body) {
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function setText(id, text) { document.querySelector(`#${id}`).textContent = text; }
function getWeak(mode) {
  try { return JSON.parse(localStorage.getItem(`${mode}WeakAreas`) || "[]"); }
  catch { return []; }
}
function saveWeak(mode, items) {
  const merged = [...new Set([...getWeak(mode), ...items])].slice(-30);
  localStorage.setItem(`${mode}WeakAreas`, JSON.stringify(merged));
  renderWeak(mode);
}
function renderWeak(mode) {
  const target = document.querySelector(`#${mode}Weak`);
  const weak = getWeak(mode);
  target.innerHTML = weak.length
    ? `<h3>📌 我的待加強觀念</h3><p>${weak.map(escapeHTML).join("、")}</p><button class="small-button" onclick="clearWeak('${mode}')">清除弱項紀錄</button>`
    : `<h3>📌 我的待加強觀念</h3><p>目前還沒有錯題紀錄。完成測驗後，系統會整理需要加強的觀念。</p>`;
}
function clearWeak(mode) {
  localStorage.removeItem(`${mode}WeakAreas`);
  renderWeak(mode);
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

async function generateLesson() {
  const output = document.querySelector("#heliOut");
  output.textContent = "AI 正在生成課程…";
  try {
    const data = await postJSON("/api/ai/lesson", { chapter: chapterSelect.value });
    lastLesson = data.text;
    output.textContent = lastLesson;
  } catch (e) { output.textContent = `錯誤：${e.message}`; }
}

async function generateQuiz(mode) {
  const target = document.querySelector(`#${mode}Quiz`);
  target.innerHTML = `<p class="loading">AI 正在準備測驗題目…</p>`;
  try {
    const topic = mode === "heli" ? chapterSelect.value : "Beginner Spanish vocabulary and phrases";
    const data = await postJSON("/api/ai/quiz", {
      mode, topic, lesson: mode === "heli" ? lastLesson : document.querySelector("#spanishOut").textContent,
      weakAreas: getWeak(mode)
    });
    currentQuizzes[mode] = data.quiz;
    renderQuiz(mode, data.quiz);
  } catch (e) { target.textContent = `錯誤：${e.message}`; }
}

function renderQuiz(mode, quiz) {
  const target = document.querySelector(`#${mode}Quiz`);
  const questionsHTML = quiz.questions.map((q, i) => {
    const control = q.type === "mcq"
      ? `<div class="options">${(q.options || []).map((opt, j) =>
          `<label class="option"><input type="radio" name="${mode}-${escapeHTML(q.id)}" value="${escapeHTML(opt)}"><span>${escapeHTML(opt)}</span></label>`
        ).join("")}</div>`
      : `<textarea class="short-answer" id="${mode}-${escapeHTML(q.id)}" placeholder="在這裡輸入你的答案…" rows="3"></textarea>`;
    return `<article class="question-card" id="${mode}-card-${escapeHTML(q.id)}">
      <h4>Q${i + 1}. ${escapeHTML(q.question)}</h4>${control}
      <div class="question-result" id="${mode}-result-${escapeHTML(q.id)}"></div>
    </article>`;
  }).join("");
  target.innerHTML = `<div class="quiz-heading"><h3>${escapeHTML(quiz.title || "AI 練習測驗")}</h3><p>${escapeHTML(quiz.instructions || "請完成以下 5 題。")}</p></div>
    ${questionsHTML}
    <button class="primary submit-quiz" id="${mode}-submit" onclick="submitQuiz('${mode}')">Submit Answers</button>
    <div id="${mode}-score" class="score-panel"></div>`;
}

async function submitQuiz(mode) {
  const quiz = currentQuizzes[mode];
  if (!quiz) return;
  const answers = quiz.questions.map(q => {
    let answer = "";
    if (q.type === "mcq") {
      const selected = document.querySelector(`input[name="${mode}-${CSS.escape(q.id)}"]:checked`);
      answer = selected ? selected.value : "";
    } else {
      answer = document.querySelector(`#${mode}-${CSS.escape(q.id)}`).value.trim();
    }
    return { id: q.id, answer };
  });
  if (answers.some(a => !a.answer)) {
    alert("還有題目沒有作答，請完成全部題目再提交。");
    return;
  }
  const button = document.querySelector(`#${mode}-submit`);
  button.disabled = true;
  button.textContent = "AI 正在批改…";
  try {
    const result = await postJSON("/api/ai/grade", { quiz, answers });
    const scoreBox = document.querySelector(`#${mode}-score`);
    scoreBox.innerHTML = `<h3>測驗結果：${result.score} / ${result.total} 分</h3><p class="score-number">${result.percentage}%</p>`;
    result.results.forEach((r, index) => {
      const q = quiz.questions.find(item => item.id === r.id);
      const box = document.querySelector(`#${mode}-result-${CSS.escape(r.id)}`);
      box.innerHTML = `<p class="${r.correct ? "correct" : "incorrect"}">${r.correct ? "✓ 答對" : "✗ 答錯"}</p>
        <p><strong>參考答案：</strong>${escapeHTML(r.correctAnswer)}</p>
        <p><strong>解析：</strong>${escapeHTML(r.explanation)}</p>
        <p><strong>批改：</strong>${escapeHTML(r.feedback)}</p>`;
      document.querySelector(`#${mode}-card-${CSS.escape(r.id)}`).classList.add(r.correct ? "is-correct" : "is-wrong");
    });
    if (result.weakAreas?.length) saveWeak(mode, result.weakAreas);
    else renderWeak(mode);
    button.textContent = "已完成批改";
  } catch (e) {
    alert(`批改失敗：${e.message}`);
    button.disabled = false;
    button.textContent = "Submit Answers";
  }
}

async function generateSpanish() {
  const output = document.querySelector("#spanishOut");
  output.textContent = "AI 正在準備今天的 10 個單字…";
  try {
    const learned = JSON.parse(localStorage.getItem("spanishLearned") || "[]");
    const day = Number(localStorage.getItem("spanishDay") || "1");
    const data = await postJSON("/api/ai/spanish-day", { day, learned });
    output.textContent = data.text;
    localStorage.setItem("spanishDay", String(day + 1));
    localStorage.setItem("spanishLearned", JSON.stringify([...learned, `Day ${day}`]));
  } catch (e) { output.textContent = `錯誤：${e.message}`; }
}

async function askTutor() {
  const question = document.querySelector("#question").value.trim();
  const output = document.querySelector("#tutorOut");
  if (!question) return;
  output.textContent = "AI 正在思考…";
  try {
    const data = await postJSON("/api/ai/tutor", { message: question, context: lastLesson });
    output.textContent = data.text;
  } catch (e) { output.textContent = `錯誤：${e.message}`; }
}

renderWeak("heli");
renderWeak("spanish");
