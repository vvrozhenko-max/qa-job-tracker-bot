// --- ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ ТАБЛИЦІ ТА АРХІВУ ---
function checkUrlDuplicate(urlToFind) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getRange("E2:E" + Math.max(sheet.getLastRow(), 2)).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === urlToFind.trim()) return true;
    }
    return false;
  } catch (e) { return false; }
}

function checkCompanyDuplicate(companyToFind) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getRange("A2:H" + Math.max(sheet.getLastRow(), 2)).getValues();
    var results = [];
    var searchName = companyToFind.toString().toLowerCase().trim();
    for (var i = 0; i < data.length; i++) {
      var compName = data[i][1] ? data[i][1].toString().toLowerCase().trim() : "";
      if (compName === searchName) {
        var dateStr = data[i][7] instanceof Date ? Utilities.formatDate(data[i][7], Session.getScriptTimeZone(), "dd.MM.yyyy") : data[i][7];
        results.push({ status: data[i][2], title: data[i][6], date: dateStr });
      }
    }
    return results;
  } catch (e) { return []; }
}

// ПЕРЕВІРКА В АРХІВІ
function checkArchiveDuplicate(companyToFind) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ARCHIVE_SHEET_NAME);
    if (!sheet) return null;
    var data = sheet.getRange("B2:M" + Math.max(sheet.getLastRow(), 2)).getValues(); // B=Компанія, M=Нотатки(Причина)
    var searchName = companyToFind.toString().toLowerCase().trim();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase().trim() === searchName) {
        return data[i][11] || "Причину не вказано"; // Стовпець M (індекс 11)
      }
    }
    return null;
  } catch (e) { return null; }
}

function getActiveCompanies() {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getRange("B2:C" + Math.max(sheet.getLastRow(), 2)).getValues();
    var comps = [];
    for (var i = 0; i < data.length; i++) {
      var status = data[i][1] ? data[i][1].toString().trim() : "";
      if (data[i][0] && status !== "відмова" && status !== "оффер" && status !== "Закрили вакансію") {
        if (comps.indexOf(data[i][0]) === -1) comps.push(data[i][0].toString().trim());
      }
    }
    return comps;
  } catch (e) { return []; }
}

function archiveRow(companyName) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    var archiveSheet = ss.getSheetByName(ARCHIVE_SHEET_NAME);
    if (!archiveSheet) { archiveSheet = ss.insertSheet(ARCHIVE_SHEET_NAME); }
    
    var data = sheet.getRange("A1:C" + sheet.getLastRow()).getValues();
    for (var i = 1; i < data.length; i++) { // Пропускаємо заголовки
      if (data[i][1] && data[i][1].toString().trim() === companyName) {
        var rowData = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn()).getValues();
        archiveSheet.appendRow(rowData[0]);
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  } catch (e) { return false; }
}

function parseValidationText(text) {
  var data = {};
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.indexOf("🏢 Компанія:") > -1) data.companyName = line.replace("🏢 Компанія:", "").trim();
    if (line.indexOf("📌 Статус:") > -1) data.type = line.replace("📌 Статус:", "").trim();
    if (line.indexOf("👤 Рекрутер:") > -1) data.recruiterName = line.replace("👤 Рекрутер:", "").trim();
    if (line.indexOf("📅 Деталі:") > -1) data.details = line.replace("📅 Деталі:", "").trim();
  }
  return data;
}

// --- ОСНОВНА ЛОГІКА БОТА ---
var Logic = {
  processMessage: function(chatId, text) {
    var cache = CacheService.getScriptCache();
    var stateKey = chatId + '_state';
    var dataKey = chatId + '_data';
    var currentState = cache.get(stateKey) || 'MAIN_MENU';

    try {
      if (text === '/start' || text === '❌ Скасувати' || text === 'повернутися на початок') {
        cache.put(stateKey, 'MAIN_MENU', 21600);
        cache.remove(dataKey);
        Telegram.sendTextWithKeyboard(chatId, "Привіт! Оберіть дію:", MAIN_MENU);
        return;
      }

      switch (currentState) {
        case 'MAIN_MENU':
          if (text === "Вакансія 💼") {
            Telegram.sendTextWithKeyboard(chatId, "Меню вакансій:", VACANCY_MENU);
          } else if (text === "Аналіз відповіді 📩") {
            cache.put(stateKey, 'WAITING_REPLY_TEXT', 21600);
            Telegram.sendTextWithKeyboard(chatId, "📩 Вставте повний текст повідомлення/листа від рекрутера:", CANCEL_MENU);
          } else if (text === "✅ Відправив фоллоу-ап") {
            var comps = getActiveCompanies();
            var kb = [];
            for (var i = 0; i < comps.length; i++) kb.push([{"text": comps[i]}]);
            kb.push([{"text": "❌ Скасувати"}]);
            cache.put(stateKey, 'WAITING_FOLLOWUP_COMPANY', 21600);
            Telegram.sendTextWithKeyboard(chatId, "Для якої компанії ви відправили фоллоу-ап?", {"keyboard": kb, "resize_keyboard": true});
          }
          break;

        // ================== ГІЛКА: НОВА ВАКАНСІЯ (Zero-Touch Update) ==================
        case 'WAITING_VACANCY_URL':
          if (checkUrlDuplicate(text)) {
            Telegram.sendTextWithKeyboard(chatId, "⚠️ <b>Ти вже подавався на цю вакансію!</b>\nЛінк знайдено в базі.", MAIN_MENU);
            cache.put(stateKey, 'MAIN_MENU', 21600); return;
          }
          var data = { url: text };
          Telegram.sendText(chatId, "🕵️‍♂️ Пробую витягнути опис вакансії за посиланням...");
          // Функція fetchUrlContent має бути в цьому ж файлі (залишаємо її з попередньої версії)
          var extractedText = typeof fetchUrlContent === 'function' ? fetchUrlContent(text) : null;
          
          if (!extractedText) {
            cache.put(dataKey, JSON.stringify(data), 21600);
            cache.put(stateKey, 'WAITING_COMPANY_NAME', 21600);
            Telegram.sendTextWithKeyboard(chatId, "⚠️ Сайт захищений від ботів. Будь ласка, напишіть назву компанії вручну:", CANCEL_MENU);
            return;
          }
          Telegram.sendText(chatId, "✅ Текст стягнуто! ⏳ ШІ генерує Cover Letter...");
          var aiResponse = generateCoverLetter(extractedText);
          var aiData = JSON.parse(aiResponse.match(/\{[\s\S]*\}/)[0]);
          data.rawText = extractedText; data.aiData = aiData;
          cache.put(dataKey, JSON.stringify(data), 21600);

          // ПЕРЕВІРКА АРХІВУ
          var archiveReason = checkArchiveDuplicate(aiData.companyName);
          if (archiveReason) {
            cache.put(stateKey, 'WAITING_AUTO_DUPLICATE_DECISION', 21600);
            Telegram.sendTextWithKeyboard(chatId, "🚨 <b>УВАГА! Ця компанія в АРХІВІ.</b>\nМи вже отримували від них відмову.\nПричина: <i>" + archiveReason + "</i>\n\nТочно хочеш податися знову?", DUPLICATE_COMPANY_MENU);
            return;
          }
          // ПЕРЕВІРКА АКТИВНИХ
          var companyHistory = checkCompanyDuplicate(aiData.companyName);
          if (companyHistory.length > 0) {
            var msg = "⚠️ <b>У нас вже є активна історія з нею:</b>\n\n";
            for (var i = 0; i < companyHistory.length; i++) msg += "🔹 " + companyHistory[i].date + " | " + companyHistory[i].title + "\nСтатус: <i>" + companyHistory[i].status + "</i>\n\n";
            cache.put(stateKey, 'WAITING_AUTO_DUPLICATE_DECISION', 21600);
            Telegram.sendTextWithKeyboard(chatId, msg + "Що робимо далі?", DUPLICATE_COMPANY_MENU);
          } else {
            // saveAndDisplayVacancy має бути в цьому ж файлі
            if(typeof saveAndDisplayVacancy === 'function') saveAndDisplayVacancy(chatId, data, aiData, extractedText, cache, stateKey);
          }
          break;

        case 'WAITING_AUTO_DUPLICATE_DECISION': // ... (стандартна логіка з минулої версії)
        case 'WAITING_COMPANY_NAME': // ... (стандартна логіка з минулої версії)
        case 'WAITING_CONTINUE_DECISION': // ... (стандартна логіка з минулої версії)
        case 'WAITING_EXPECTED_SALARY': // ... (стандартна логіка з минулої версії)
          // Залишаємо ці блоки без змін з попередньої версії (щоб не перевантажувати код, якщо вони вже є)
          break;

        // ================== ГІЛКА: АНАЛІЗ ВІДПОВІДІ ==================
        case 'WAITING_REPLY_TEXT':
          Telegram.sendText(chatId, "⏳ Аналізую відповідь...");
          var aiResp = analyzeRecruiterReply(text);
          var replyData = JSON.parse(aiResp.match(/\{[\s\S]*\}/)[0]);
          
          if (!replyData.companyName || replyData.companyName === "") {
            var comps = getActiveCompanies();
            if (comps.length > 0) {
              var kb = [];
              for (var i = 0; i < comps.length; i++) kb.push([{"text": comps[i]}]);
              kb.push([{"text": "❌ Скасувати"}]);
              replyData.tempText = text; // Зберігаємо оригінал
              cache.put(dataKey, JSON.stringify(replyData), 21600);
              cache.put(stateKey, 'WAITING_REPLY_COMPANY_SELECT', 21600);
              Telegram.sendTextWithKeyboard(chatId, "ШІ не зміг знайти назву компанії у тексті. Оберіть її зі списку активних:", {"keyboard": kb, "resize_keyboard": true});
              return;
            } else {
              replyData.companyName = "Не визначено";
            }
          }
          
          // Формуємо звіт для валідації
          var details = "";
          if (replyData.type === "відмова") details = replyData.reason;
          else if (replyData.type === "інтерв'ю") details = "Дата: " + replyData.dateTime + " | Лінк: " + replyData.link;
          else if (replyData.type === "очікування") details = replyData.deadlineDays ? "Дедлайн: " + replyData.deadlineDays + " днів" : "Без жорсткого дедлайну";

          var report = "Ось як я зрозумів цю відповідь:\n🏢 Компанія: " + replyData.companyName + "\n📌 Статус: " + replyData.type + "\n👤 Рекрутер: " + replyData.recruiterName + "\n📅 Деталі: " + details + "\n\nВсе вірно?";
          
          cache.put(dataKey, JSON.stringify(replyData), 21600);
          cache.put(stateKey, 'WAITING_REPLY_VALIDATION', 21600);
          Telegram.sendTextWithKeyboard(chatId, report, VALIDATION_MENU);
          break;

        case 'WAITING_REPLY_COMPANY_SELECT':
          var rData = JSON.parse(cache.get(dataKey));
          rData.companyName = text;
          
          var details = "";
          if (rData.type === "відмова") details = rData.reason;
          else if (rData.type === "інтерв'ю") details = "Дата: " + rData.dateTime + " | Лінк: " + rData.link;
          else if (rData.type === "очікування") details = rData.deadlineDays ? "Дедлайн: " + rData.deadlineDays + " днів" : "Без жорсткого дедлайну";

          var report = "Ось як я зрозумів цю відповідь:\n🏢 Компанія: " + rData.companyName + "\n📌 Статус: " + rData.type + "\n👤 Рекрутер: " + rData.recruiterName + "\n📅 Деталі: " + details + "\n\nВсе вірно?";
          
          cache.put(dataKey, JSON.stringify(rData), 21600);
          cache.put(stateKey, 'WAITING_REPLY_VALIDATION', 21600);
          Telegram.sendTextWithKeyboard(chatId, report, VALIDATION_MENU);
          break;

        case 'WAITING_REPLY_VALIDATION':
          if (text === "✅ Так, продовжуй") {
            cache.put(stateKey, 'WAITING_REPLY_CHANNEL', 21600);
            Telegram.sendTextWithKeyboard(chatId, "Через який канал прийшла відповідь?", CHANNEL_MENU);
          } else if (text === "❌ Ні, є помилка") {
            cache.put(stateKey, 'WAITING_MANUAL_REPLY_EDIT', 21600);
            Telegram.sendTextWithKeyboard(chatId, "Будь ласка, скопіюй мій текст звіту вище, виправ помилку (наприклад, зміни статус чи дату) і надішли мені назад:", CANCEL_MENU);
          }
          break;

        case 'WAITING_MANUAL_REPLY_EDIT':
          var parsedData = parseValidationText(text);
          if (!parsedData.companyName || !parsedData.type) {
            Telegram.sendText(chatId, "⚠️ Не вдалося розпізнати формат. Переконайтесь, що ви скопіювали текст з '🏢 Компанія:' та '📌 Статус:'. Спробуйте ще раз.");
            return;
          }
          cache.put(dataKey, JSON.stringify(parsedData), 21600);
          cache.put(stateKey, 'WAITING_REPLY_CHANNEL', 21600);
          Telegram.sendTextWithKeyboard(chatId, "✅ Виправлення прийнято. Через який канал прийшла відповідь?", CHANNEL_MENU);
          break;

        case 'WAITING_REPLY_CHANNEL':
          var repData = JSON.parse(cache.get(dataKey));
          repData.channel = text;
          var company = repData.companyName;
          var ss = SpreadsheetApp.openById(SHEET_ID);
          var sheet = ss.getSheetByName(SHEET_NAME);
          var data = sheet.getRange("B1:B" + sheet.getLastRow()).getValues();
          var targetRow = -1;
          
          for (var i = data.length - 1; i >= 0; i--) {
            if (data[i][0] && data[i][0].toString().trim() === company) { targetRow = i + 1; break; }
          }

          if (targetRow === -1) {
            Telegram.sendTextWithKeyboard(chatId, "❌ Компанію '" + company + "' не знайдено в таблиці. Скасовано.", MAIN_MENU);
            cache.put(stateKey, 'MAIN_MENU', 21600); return;
          }

          var today = new Date();
          sheet.getRange(targetRow, 8).setValue(today); // Дата контакту
          sheet.getRange(targetRow, 11).setValue(repData.recruiterName || ""); // Рекрутер
          sheet.getRange(targetRow, 12).setValue(repData.channel); // Канал

          // СЦЕНАРІЙ 1: ВІДМОВА
          if (repData.type.toLowerCase().indexOf("відмова") > -1) {
            sheet.getRange(targetRow, 3).setValue("відмова");
            sheet.getRange(targetRow, 13).setValue(repData.reason || repData.details || "Відмова"); // Нотатки
            
            var replyMsg = generateReplyText("відмова", repData.recruiterName);
            Telegram.sendText(chatId, replyMsg);
            
            if (archiveRow(company)) {
              Telegram.sendTextWithKeyboard(chatId, "✅ Відмова врахована. Вакансія перенесена в Архів.", MAIN_MENU);
            }
          } 
          // СЦЕНАРІЙ 2: ІНТЕРВ'Ю
          else if (repData.type.toLowerCase().indexOf("інтерв") > -1 || repData.type.toLowerCase().indexOf("тестове") > -1) {
            sheet.getRange(targetRow, 3).setValue("з рекрутером");
            
            var details = repData.details || "";
            var dateMatch = details.match(/Дата:\s*(.*?)(?=\s*\||$)/);
            var linkMatch = details.match(/Лінк:\s*(.*)/);
            
            if (dateMatch && dateMatch[1]) sheet.getRange(targetRow, 14).setValue(dateMatch[1].trim()); // N (Дата зустрічі)
            if (linkMatch && linkMatch[1]) sheet.getRange(targetRow, 15).setValue(linkMatch[1].trim()); // O (Лінк)
            
            var replyMsg = generateReplyText("інтерв'ю", repData.recruiterName);
            Telegram.sendText(chatId, replyMsg);
            
            // Будильники створюватиме Cron, скануючи стовпець N кожну годину
            Telegram.sendTextWithKeyboard(chatId, "✅ Інтерв'ю призначено! Я встановлю нагадування (за 24г та 1г).", MAIN_MENU);
          } 
          // СЦЕНАРІЙ 3: ОЧІКУВАННЯ
          else if (repData.type.toLowerCase().indexOf("очікув") > -1) {
            sheet.getRange(targetRow, 3).setValue("очікую відповіді");
            
            var deadlineMatch = (repData.details || "").match(/Дедлайн:\s*(\d+)\s*днів/);
            if (repData.deadlineDays || deadlineMatch) {
              var days = parseInt(repData.deadlineDays || deadlineMatch[1]);
              var deadlineDate = new Date();
              deadlineDate.setDate(deadlineDate.getDate() + days + 1);
              sheet.getRange(targetRow, 21).setValue(Utilities.formatDate(deadlineDate, Session.getScriptTimeZone(), "dd.MM.yyyy")); // U (Дедлайн)
              Telegram.sendTextWithKeyboard(chatId, "✅ Статус 'очікую відповіді'. Встановлено жорсткий дедлайн на " + days + " днів.", MAIN_MENU);
            } else {
              sheet.getRange(targetRow, 21).clearContent(); // Очищаємо U
              Telegram.sendTextWithKeyboard(chatId, "✅ Статус 'очікую відповіді'. Без дедлайну (включено детектор тиші на 7 днів).", MAIN_MENU);
            }
          }

          cache.put(stateKey, 'MAIN_MENU', 21600);
          cache.remove(dataKey);
          break;

        // ================== ФОЛЛОУ-АП ==================
        case 'WAITING_FOLLOWUP_COMPANY':
          var company = text;
          try {
            var ss = SpreadsheetApp.openById(SHEET_ID);
            var sheet = ss.getSheetByName(SHEET_NAME);
            var data = sheet.getRange("B1:B" + sheet.getLastRow()).getValues();
            var targetRow = -1;
            for (var i = data.length - 1; i >= 0; i--) {
              if (data[i][0] && data[i][0].toString().trim() === company) { targetRow = i + 1; break; }
            }
            if (targetRow !== -1) {
              sheet.getRange(targetRow, 8).setValue(new Date()); // H
              var oldNotes = sheet.getRange(targetRow, 13).getValue();
              sheet.getRange(targetRow, 13).setValue(oldNotes + " | відправили запит-уточнення"); // M
              Telegram.sendTextWithKeyboard(chatId, "✅ Фоллоу-ап зафіксовано. Дату оновлено.", MAIN_MENU);
            }
          } catch(e) {}
          cache.put(stateKey, 'MAIN_MENU', 21600);
          break;

        default:
          cache.put(stateKey, 'MAIN_MENU', 21600);
          Telegram.sendTextWithKeyboard(chatId, "Повертаємось до меню.", MAIN_MENU);
      }
    } catch (e) {
      Telegram.sendText(chatId, "❌ Помилка в Logic: " + e.toString());
    }
  }
};