Устанавливаем Node.js и pm2
git clone https://github.com/ilnazonn/banks_notification
cd в папку куда клонировали
Там выполняем npm i
Создаем в корне проекта файл .env с данными: 
BOT_TOKEN=
TELEGRAM_CHAT_ID=-
AVAILABILITY_PERCENT=80
После успешной загрузки выполняем npm run build
Запускаем pm2 start dist/notification_bot.js --name "notification_bot" --env .env
