// GEMINI_API_KEY та MY_BACKGROUND підтягуються глобально з Config.js

function callGemini(promptText) {
  var models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  var lastError = "";

  for (var i = 0; i < models.length; i++) {
    var model = models[i];
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + GEMINI_API_KEY;
    
    var payload = { "contents": [{ "parts": [{ "text": promptText }] }] };
    var options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };

    try {
      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();
      var json = JSON.parse(response.getContentText());

      if (code === 200 && json.candidates) {
        var textResult = json.candidates[0].content.parts[0].text;
        // Зачищаємо можливий маркдаун від ШІ, щоб не зламати JSON.parse()
        return textResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      } else {
        lastError = (json.error && json.error.message) ? json.error.message : "HTTP " + code;
      }
    } catch (e) { lastError = e.toString(); }
  }
  throw new Error("Всі моделі вичерпали ліміти. Помилка: " + lastError);
}

function generateCoverLetter(vacancyText) {
  var prompt = "Ти — Senior QA та копірайтер. Завдання: написати лист для Віктора (Junior QA Engineer), зробити аналіз компанії та витягти дані.\n\n" +
    "БЕКГРАУНД КАНДИДАТА:\n" + MY_BACKGROUND + "\n\n" +
    "ЖОРСТКІ ПРАВИЛА:\n" +
    "1. 5-7 рядків суті.\n" +
    "2. ПРИВІТАННЯ/ПРОЩАННЯ З НОВОГО АБЗАЦУ (\\n\\n).\n" +
    "3. Почни (UK): 'Вітаю, моє імʼя Віктор. Я подаюсь на вакансію [Посада]...'\n" +
    "4. Закінчи (UK): 'До листа прикріпляю своє CV. Чекаю на відповідь. Гарного дня :)'\n" +
    "5. Почни (EN): 'Good day, my name is Viktor. I am applying for the [Position] role...'\n" +
    "6. Закінчи (EN): 'I am attaching my CV to this email. Looking forward to your reply. Have a great day :)'\n\n" +
    "ФОРМАТ ВІДПОВІДІ (ТІЛЬКИ ЧИСТИЙ JSON):\n" +
    "{\n  \"coverLetterEN\": \"...\",\n  \"coverLetterUK\": \"...\",\n  \"analysis\": \"...\",\n  \"extractedTitle\": \"...\",\n  \"extractedBudget\": \"... (або 'Не вказано')\",\n  \"companyName\": \"...\"\n}\n\n" +
    "ТЕКСТ ВАКАНСІЇ:\n" + vacancyText;
  return callGemini(prompt);
}

function analyzeRecruiterReply(replyText) {
  var prompt = "Ти — HR-асистент. Проаналізуй відповідь від компанії.\n" +
    "КАТЕГОРІЇ (type):\n" +
    "1. 'відмова' (явна відмова).\n" +
    "2. 'інтерв'ю' (запрошення на дзвінок, тестове, зустріч).\n" +
    "3. 'очікування' (ми розглянемо, ми додамо в базу і т.д.).\n\n" +
    "ФОРМАТ ВІДПОВІДІ (ТІЛЬКИ ЧИСТИЙ JSON):\n" +
    "{\n" +
    "  \"companyName\": \"Назва компанії (якщо є, інакше '')\",\n" +
    "  \"type\": \"відмова\" АБО \"інтерв'ю\" АБО \"очікування\",\n" +
    "  \"recruiterName\": \"Ім'я рекрутера (якщо є, інакше '')\",\n" +
    "  \"dateTime\": \"Дата і час у форматі ДД.ММ.РРРР ГГ:ХХ (тільки для інтерв'ю, якщо є, інакше '')\",\n" +
    "  \"link\": \"Посилання на дзвінок/тестове (якщо є, інакше '')\",\n" +
    "  \"deadlineDays\": \"Число днів (ТІЛЬКИ ЯКЩО вказано жорсткий дедлайн: 'якщо не відповімо за Х днів...', інакше '')\",\n" +
    "  \"reason\": \"Причина відмови (тільки для відмови, 1-2 речення, інакше '')\"\n" +
    "}\n\n" +
    "ТЕКСТ ВІДПОВІДІ:\n" + replyText;
  return callGemini(prompt);
}

function generateReplyText(type, recruiterName) {
  var name = recruiterName ? recruiterName : "рекрутере";
  if (type === "відмова") {
    return "Вітаю, " + name + ".\n\nДякую за фідбек та приділений час. Звичайно шкода, але бажаю вам швидко закрити вакансію гарним спеціалістом.\n\nГарного дня :)";
  } else if (type === "інтерв'ю") {
    return "Вітаю, " + name + ".\n\nДякую за запрошення! Чудово, я обов’язково буду в зазначений час.\n\nГарного дня :)";
  }
  return "";
}

function generateFollowUpText(companyName, recruiterName) {
  var name = recruiterName ? recruiterName : "рекрутере";
  var comp = companyName ? (" у компанії " + companyName) : "";
  var prompt = "Напиши короткий, ввічливий фоллоу-ап (1 абзац) українською. Віктор питає рекрутера " + name + comp + " на якому етапі розгляд його CV. Почни 'Вітаю...'.";
  return callGemini(prompt);
}