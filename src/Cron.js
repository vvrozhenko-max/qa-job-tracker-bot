// --- 1. РАНДОМНА МОТИВАЦІЯ ---
function sendDailyMotivation() {
  if (typeof MOTIVATION_MESSAGES !== 'undefined' && MOTIVATION_MESSAGES.length > 0) {
    var randomIndex = Math.floor(Math.random() * MOTIVATION_MESSAGES.length);
    Telegram.sendText(MY_TELEGRAM_ID, "💡 <b>Хвилинка мотивації:</b>\n" + MOTIVATION_MESSAGES[randomIndex]);
  } else {
    Telegram.sendText(MY_TELEGRAM_ID, "💡 <b>Хвилинка мотивації:</b>\nЧас знайти нову вакансію! 🚀");
  }
}

function scheduleRandomMotivations() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendDailyMotivation') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  var today = new Date();
  var day = today.getDay();
  // Тільки Пн-Пт
  if (day >= 1 && day <= 5) {
    for (var j = 0; j < 2; j++) {
      var hour = Math.floor(Math.random() * (20 - 9)) + 9; 
      var minute = Math.floor(Math.random() * 60);         
      var triggerTime = new Date();
      triggerTime.setHours(hour, minute, 0, 0);
      if (triggerTime > new Date()) { 
        ScriptApp.newTrigger('sendDailyMotivation').timeBased().at(triggerTime).create(); 
      }
    }
  }
}

// --- 2. ПЕРЕВІРКА ЧЕРНЕТОК (Пн, Чт о 12:00) ---
function checkPendingVacanciesCron() {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getRange("B2:C" + Math.max(sheet.getLastRow(), 2)).getValues();
    var pending = [];
    
    for (var i = 0; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().trim() === "нова вакансія" && data[i][0]) {
        pending.push(data[i][0].toString().trim());
      }
    }
    
    if (pending.length === 0) {
      Telegram.sendText(MY_TELEGRAM_ID, "Чо сидиш? Іди шукай роботу! 💼🚀");
    } else {
      var kb = [];
      for (var j = 0; j < pending.length; j++) {
        kb.push([{"text": pending[j]}]);
      }
      kb.push([{"text": "❌ Скасувати"}]);
      
      var cache = CacheService.getScriptCache();
      cache.put(MY_TELEGRAM_ID + '_state', 'WAITING_PENDING_COMPANY_SELECTION', 21600);
      Telegram.sendTextWithKeyboard(MY_TELEGRAM_ID, "⏰ <b>Нагадування!</b> У тебе є невідправлені резюме. Обирай компанію і погнали:", { "keyboard": kb, "resize_keyboard": true });
    }
  } catch (e) {
    Telegram.sendText(MY_TELEGRAM_ID, "❌ Помилка в Cron (checkPendingVacancies): " + e.toString());
  }
}

// --- 3. ДЕТЕКТОР ТИШІ + ФОЛЛОУ-АПИ (Вт, Пт о 12:00) ---
function checkReminders() {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    
    // B(1)=Компанія, C(2)=Статус, F(5)=Дні, G(6)=Посада, K(10)=Рекрутер, U(20)=Дедлайн
    for (var i = 1; i < data.length; i++) {
      var status = String(data[i][2]).trim();
      var daysDiff = parseInt(data[i][5]);
      var deadlineStr = data[i][20];
      
      if (!isNaN(daysDiff) && daysDiff >= 7 && (status === "відправив резюме" || status === "очікую відповіді")) {
        // Якщо немає жорсткого дедлайну, генеруємо фоллоу-ап текст
        if (!deadlineStr || deadlineStr === "") {
           var comp = data[i][1];
           var recr = data[i][10];
           var fuText = generateFollowUpText(comp, recr);
           Telegram.sendText(MY_TELEGRAM_ID, "🔔 <b>Час нагадати про себе!</b>\nКомпанія: " + comp + " (" + data[i][6] + ") мовчить " + daysDiff + " днів.\n\n<b>Текст для відправки:</b>\n" + fuText);
        }
      }
    }
  } catch (e) {}
}

// --- 4. ДЕТЕКТОР ЖОРСТКИХ ДЕДЛАЙНІВ (Щодня о 10:00) ---
function checkDeadlinesCron() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var today = new Date();
    today.setHours(0,0,0,0);

    for (var i = 1; i < data.length; i++) {
      var status = String(data[i][2]).trim();
      var deadlineStr = data[i][20]; // U
      
      if (status === "очікую відповіді" && deadlineStr) {
        var parts = deadlineStr.toString().split(".");
        if (parts.length === 3) {
          var dDate = new Date(parts[2], parts[1] - 1, parts[0]);
          dDate.setHours(0,0,0,0);
          
          if (today >= dDate) {
            var comp = data[i][1];
            sheet.getRange(i+1, 3).setValue("відмова");
            sheet.getRange(i+1, 13).setValue("Відмова по тайм-ауту");
            
            if (typeof archiveRow === 'function') { archiveRow(comp); }
            Telegram.sendText(MY_TELEGRAM_ID, "⏳ <b>Компанія " + comp + " ВІДМОВА ПО ТАЙМ-АУТУ</b>\nТермін очікування вийшов, вакансію заархівовано.");
          }
        }
      }
    }
  } catch (e) {}
}

// --- 5. НАГАДУВАННЯ ПРО ІНТЕРВ'Ю (Щогодини) ---
function checkInterviewsCron() {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var now = new Date();

    for (var i = 1; i < data.length; i++) {
      var status = String(data[i][2]).trim();
      var interviewDateStr = data[i][13]; // N
      
      if ((status === "з рекрутером" || status === "тестове" || status === "основна / технічна") && interviewDateStr) {
        var parts = interviewDateStr.toString().split(" ");
        if (parts.length === 2) {
          var dParts = parts[0].split(".");
          var tParts = parts[1].split(":");
          var iDate = new Date(dParts[2], dParts[1] - 1, dParts[0], tParts[0], tParts[1]);
          
          var diffHours = (iDate - now) / (1000 * 60 * 60);
          
          var comp = data[i][1];
          var recr = data[i][10];
          var link = data[i][14]; // O
          
          // За 24 години
          if (diffHours > 23.5 && diffHours <= 24.5) {
            Telegram.sendText(MY_TELEGRAM_ID, "⏰ <b>НАГАДУВАННЯ: Завтра інтерв'ю!</b>\nКомпанія: " + comp + "\nЗ ким: " + recr + "\nКоли: " + interviewDateStr + "\nПосилання: " + link);
          }
          // За 1 годину
          else if (diffHours > 0.5 && diffHours <= 1.5) {
            Telegram.sendText(MY_TELEGRAM_ID, "🚨 <b>НАГАДУВАННЯ: Інтерв'ю через годину!</b>\nКомпанія: " + comp + "\nЗ ким: " + recr + "\nПосилання: " + link);
          }
        }
      }
    }
  } catch (e) {}
}

// --- ГОЛОВНА ФУНКЦІЯ НАЛАШТУВАННЯ РОЗКЛАДУ ---
function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  
  ScriptApp.newTrigger('scheduleRandomMotivations').timeBased().atHour(1).everyDays(1).create();
  
  ScriptApp.newTrigger('checkPendingVacanciesCron').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(12).create();
  ScriptApp.newTrigger('checkPendingVacanciesCron').timeBased().onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(12).create();

  ScriptApp.newTrigger('checkReminders').timeBased().onWeekDay(ScriptApp.WeekDay.TUESDAY).atHour(12).create();
  ScriptApp.newTrigger('checkReminders').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(12).create();

  ScriptApp.newTrigger('checkDeadlinesCron').timeBased().atHour(10).everyDays(1).create();
  ScriptApp.newTrigger('checkInterviewsCron').timeBased().everyHours(1).create();

  scheduleRandomMotivations();
}