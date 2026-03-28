// Головна функція, яка приймає всі повідомлення від Телеграму
function doPost(e) {
  try {
    // Захист від пустих запитів
    if (!e || !e.postData || !e.postData.contents) {
      return HtmlService.createHtmlOutput("OK");
    }

    var data = JSON.parse(e.postData.contents);
    
    if (data.message && data.message.text) {
      var chatId = data.message.chat.id;
      var text = data.message.text;

      // Сек'юріті перевірка: чи це адмін пише боту? 
      // MY_TELEGRAM_ID підтягується з Config.js
      if (chatId != MY_TELEGRAM_ID) {
        Telegram.sendText(chatId, "Вибачте, цей бот приватний. Доступ заборонено.");
        return HtmlService.createHtmlOutput("OK");
      }

      // Відправляємо текст в Logic.js
      Logic.processMessage(chatId, text);
    }
  } catch (err) {
    // Якщо сталася помилка, бот відправить її тобі в чат
    Telegram.sendText(MY_TELEGRAM_ID, "❌ Помилка в Code.js: " + err.toString());
  }
  
  // Телеграм очікує 200 OK
  return HtmlService.createHtmlOutput("OK");
}