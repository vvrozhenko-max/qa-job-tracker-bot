// УВАГА: Це шаблон. Реальні ключі знаходяться у файлі Config.js, який додано до .gitignore

var BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";
var SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";
var SHEET_NAME = "Job-трекер";
var ARCHIVE_SHEET_NAME = "Архів"; 
var MY_TELEGRAM_ID = 123456789;
var GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
var MY_BACKGROUND = "Тут текст бекграунду кандидата";

var MAIN_MENU = { "keyboard": [[{"text": "Аналіз відповіді 📩"}, {"text": "Вакансія 💼"}], [{"text": "Статистика 📊"}, {"text": "✅ Відправив фоллоу-ап"}]], "resize_keyboard": true };
var VACANCY_MENU = { "keyboard": [[{"text": "URL на вакансію"}, {"text": "Cover Letter"}], [{"text": "повернутися на початок"}]], "resize_keyboard": true };
var CANCEL_MENU = { "keyboard": [[{"text": "❌ Скасувати"}]], "resize_keyboard": true };
var CONTINUE_MENU = { "keyboard": [[{"text": "Гоу далі 🚀"}, {"text": "Залишимо на потім ⏸️"}]], "resize_keyboard": true };
var DUPLICATE_COMPANY_MENU = { "keyboard": [[{"text": "❌ Відмінити"}, {"text": "✅ Все ж таки додати ще одну"}]], "resize_keyboard": true };
var RESUME_SENT_MENU = { "keyboard": [[{"text": "❌ Скасувати"}, {"text": "✅ Резюме надіслав"}]], "resize_keyboard": true };
var CHANNEL_MENU = { "keyboard": [[{"text": "Telegram"}, {"text": "Viber"}], [{"text": "Gmail"}, {"text": "На платформі"}], [{"text": "❌ Скасувати"}]], "resize_keyboard": true };
var VALIDATION_MENU = { "keyboard": [[{"text": "✅ Так, продовжуй"}, {"text": "❌ Ні, є помилка"}]], "resize_keyboard": true };