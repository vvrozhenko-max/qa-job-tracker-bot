var Telegram = {
  sendText: function(chatId, text) {
    // BOT_TOKEN підтягується глобально з Config.js
    var url = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage";
    var payload = {
      "chat_id": chatId,
      "text": text,
      "parse_mode": "HTML"
    };
    
    return UrlFetchApp.fetch(url, {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    });
  },

  sendTextWithKeyboard: function(chatId, text, keyboard) {
    var url = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage";
    var payload = {
      "chat_id": chatId,
      "text": text,
      "parse_mode": "HTML",
      "reply_markup": keyboard
    };
    
    return UrlFetchApp.fetch(url, {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    });
  }
};