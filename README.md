# 🎯 QA Job Tracker Bot (v1.3)

![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue?logo=telegram)
![Google Apps Script](https://img.shields.io/badge/Google_Apps_Script-Backend-green)
![Gemini AI](https://img.shields.io/badge/Gemini_API-AI-orange)
![QA Testing](https://img.shields.io/badge/QA-Manual_%7C_API_%7C_E2E-success)

## 📌 Про проєкт
**QA Job Tracker Bot** — це кастомна CRM-система у вигляді Telegram-бота для автоматизації та відстеження процесу пошуку роботи. Проєкт створений не лише для зручного менеджменту відгуків на вакансії, але й як **майданчик для практики процесів забезпечення якості (QA)**: написання тестової документації, тестування API, UI/UX логіки та роботи з базами даних.

## 🛠 Технологічний стек
* **Backend:** Google Apps Script (Enterprise-модульна архітектура)
* **Database:** Google Sheets (з використанням складних ARRAYFORMULA та "снайперського запису")
* **Integrations:** Telegram Bot API, Gemini AI API
* **QA Tools:** Jira (Bug Tracking), Postman (API Testing), Draw.io (Mind maps & State Transitions), Qase.io (Test Management)

## 🚀 Ключовий функціонал
- **Zero-Touch Parsing & AI аналіз:** Автоматичний збір даних з посилань на вакансії та генерація Cover Letters (UK/EN) за допомогою ШІ.
- **Human-in-the-Loop:** Валідація згенерованих ШІ відповідей рекрутерам перед записом у базу.
- **Розумна система статусів:** Маршрутизація від "Нової вакансії" до "Оферу" або "Архіву (Відмова)".
- **Cron Manager (Фонові задачі):** Автоматичні нагадування про співбесіди, "Детектор тиші" (follow-ups) та тайм-аути для неактивних вакансій.

---

## 🧪 QA Process & Testing (Процес тестування)
*Цей розділ демонструє підхід до тестування даного продукту.*

### 1. Тестова документація
- **Mind Map & State Transition:** [Посилання на схему в Draw.io / Notion] *(Тут буде лінк на твої схеми)*
- **Test Cases & Checklists:** [Посилання на Qase.io / таблицю] *(Тут буде лінк на твої тест-кейси)*
- **Postman Collection:** У папці `/api_testing` цього репозиторію лежить експортована колекція з налаштованими запитами до Telegram API для тестування відправки повідомлень та вебхуків.

### 2. Види проведеного тестування
- **Functional Testing:** Перевірка всіх User Flows (створення вакансії, зміна статусів, робота cron-тригерів).
- **API Testing:** Перевірка відповідей від Telegram API та коректності парсингу JSON від Gemini API (Postman).
- **Database Testing:** Перевірка "снайперського запису" в Google Sheets, відсутність конфліктів з ARRAYFORMULA, перевірка анти-дублікатів.
- **Negative Testing:** Перевірка стійкості системи до некоректних вводів (файли замість тексту, невалідні URL, обхід захисту Cloudflare).

### 3. Баг-трекінг
Усі знайдені дефекти фіксувалися в **Jira**. Приклади оформлених Bug Reports можна переглянути тут: [Посилання на дошку Jira або PDF зі звітом].

---

## 📂 Архітектура (Бекенд)
Проєкт побудовано за модульним принципом для зручності підтримки та масштабування:
* `Config.gs` — Сховище констант та JSON-клавіатур.
* `Код.gs` — Вхідна точка (doPost), перевірка безпеки.
* `Telegram.gs` — Сервісний модуль для відправки повідомлень.
* `AI.gs` — Промпти та інтеграція з Gemini API (робота з JSON).
* `Logic.gs` — Маршрутизатор станів користувача, запис у БД.
* `Cron.gs` — Менеджер фонових задач (нагадування, дедлайни).
* `Data.gs` — База мотиваційних цитат.

## 👤 Автор
**Віктор** - Junior QA Engineer
[LinkedIn] | [Telegram]