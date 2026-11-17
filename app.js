const chapters = [
  "Helicopter Fundamentals",
  "The Four Forces",
  "Rotor Blades & Airfoils",
  "How a Helicopter Generates Lift",
  "Cyclic",
  "Collective",
  "Anti-torque System",
  "Swashplate",
  "Rotor Disc",
  "Angle of Attack",
  "Translational Lift",
  "Ground Effect",
  "Dissymmetry of Lift",
  "Retreating Blade Stall",
  "Autorotation",
  "Turboshaft Engine",
  "Transmission",
  "Main Rotor System",
  "Tail Rotor System"
];

const chapterSelect = document.querySelector("#chapter");
chapters.forEach((chapter, index) => {
  chapterSelect.add(new Option(`${index + 1}. ${chapter}`, chapter));
});

let lastLesson = "";

function showPage(id) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });
  document.querySelector(`#${id}`).classList.add("active");
}

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data.text;
}

async function generateLesson() {
  const output = document.querySelector("#heliOut");
  output.textContent = "AI 正在生成課程…";

  try {
    lastLesson = await postJSON("/api/ai/lesson", {
      chapter: chapterSelect.value
    });
    output.textContent = lastLesson;
  } catch (error) {
    output.textContent = `錯誤：${error.message}`;
  }
}

async function generateQuiz() {
  const output = document.querySelector("#heliOut");
  output.textContent = "AI 正在出題…";

  try {
    output.textContent = await postJSON("/api/ai/quiz", {
      lesson: lastLesson || "Helicopter Fundamentals"
    });
  } catch (error) {
    output.textContent = `錯誤：${error.message}`;
  }
}

async function generateSpanish() {
  const output = document.querySelector("#spanishOut");
  output.textContent = "AI 正在準備今天的 10 個單字…";

  try {
    const learned = JSON.parse(
      localStorage.getItem("spanishLearned") || "[]"
    );

    output.textContent = await postJSON("/api/ai/spanish-day", {
      day: 1,
      learned
    });
  } catch (error) {
    output.textContent = `錯誤：${error.message}`;
  }
}

async function askTutor() {
  const question = document.querySelector("#question").value.trim();
  const output = document.querySelector("#tutorOut");

  if (!question) return;

  output.textContent = "AI 正在思考…";

  try {
    output.textContent = await postJSON("/api/ai/tutor", {
      message: question,
      context: lastLesson
    });
  } catch (error) {
    output.textContent = `錯誤：${error.message}`;
  }
}
