import { bot } from './components/config.js';
import { sendStartupNotification } from './components/startupNotification.js';
import './components/commands.js';
import './components/intervalNotification.js';
import './components/startupNotification.js';
import './components/exceptions.js';
import dotenv from 'dotenv';
dotenv.config();
bot.start().then(async () => {
    console.log('Бот запущен');
    // Печатаем информацию о боте
    const me = await bot.api.getMe();
    console.log(`Бот @${me.username} готов к работе`);
}).catch((error) => {
    console.error('Ошибка при запуске бота:');
    if (error instanceof Error) {
        console.error('Сообщение об ошибке:', error.message);
        // Дополнительная информация для Telegram API ошибок
        if ('response' in error && error.response) {
            console.error('Response data:', error.response.data);
        }
    }
    else {
        console.error('Неизвестная ошибка:', error);
    }
});
// Дополнительная отладка
console.log('Инициализация бота...');
await sendStartupNotification();
bot.init().then(() => {
    console.log('Инициализация успешна');
}).catch((initError) => {
    console.error('Ошибка инициализации:', initError);
});
