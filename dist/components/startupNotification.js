import axios from "axios";
import { bot } from './config.js';
async function sendStartupNotification() {
    try {
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!chatId) {
            console.error('Ошибка: TELEGRAM_CHAT_ID не задано!');
            return;
        }
        console.log(`Попытка отправить сообщение в чат: ${chatId}`); // Лог перед отправкой
        const message = '🤖 Бот мониторинга доступности банков запущен!\n' +
            'Используйте /banks для получения текущих данных.\n' +
            'Автоматические уведомления будут приходить при проблемах.\n' +
            '📡 Источник данных: API Vendista';
        console.log('Сообщение для отправки:', message); // Лог сообщения перед отправкой
        const result = await bot.api.sendMessage(chatId, message);
        console.log('Уведомление о старте отправлено. Результат:', result); // Лог результата отправки
    }
    catch (error) {
        console.error('Ошибка отправки уведомления:');
        if (axios.isAxiosError(error)) {
            console.error('Axios error:', error.response?.data);
        }
        else if (error instanceof Error) {
            console.error('Error message:', error.message);
            // Для Telegram API ошибок
            if ('description' in error) {
                console.error('Telegram API error:', error.description);
            }
        }
        else {
            console.error('Unknown error:', error);
        }
    }
}
export { sendStartupNotification };
