import { Bot, Context } from 'grammy';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
dotenv.config();

interface BankData {
    name: string;
    availability: number;
}

const token = process.env.BOT_TOKEN;
const bot = new Bot(token as string);
const chatId = process.env.TELEGRAM_CHAT_ID;
const availabilityThresholdString = process.env.AVAILABILITY_PERCENT;

async function sendStartupNotification() {
    try {
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!chatId) {
            console.error('Ошибка: TELEGRAM_CHAT_ID не задано!');
            return;
        }

        console.log(`Попытка отправить сообщение в чат: ${chatId}`); // Лог перед отправкой

        const result = await bot.api.sendMessage(
            chatId,
            '🤖 Бот мониторинга доступности банков запущен!\n' +
            'Используйте /banks для получения текущих данных.\n' +
            'Автоматические уведомления будут приходить при проблемах.'
        );
        console.log('Уведомление о старте отправлено:', result);
    } catch (error) {
        console.error('Ошибка отправки уведомления:');

        if (axios.isAxiosError(error)) {
            console.error('Axios error:', error.response?.data);
        } else if (error instanceof Error) {
            console.error('Error message:', error.message);

            // Для Telegram API ошибок
            if ('description' in error) {
                console.error('Telegram API error:', error.description);
            }
        } else {
            console.error('Unknown error:', error);
        }
    }
}



bot.command('banks', async (ctx: Context) => {
    try {
        await ctx.reply('Запрашиваю текущие данные о банках...');
        const banksData = await fetchBanksData();
        const formattedData = formatBanksData(banksData);
        await ctx.reply(formattedData, { parse_mode: 'HTML' });
        await checkAndNotifyLowAvailability(banksData);
    } catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('Произошла ошибка при получении данных.');
    }
});

async function fetchBanksData(): Promise<BankData[]> {
    const url = 'https://vendista.ru/banks_availability';
    const response = await axios.get(url);
    return parseBanksData(response.data);
}

function parseBanksData(html: string): BankData[] {
    const $ = cheerio.load(html);
    const banks: BankData[] = [];

    $('table tr').each((_, row) => {
        const columns = $(row).find('td');
        if (columns.length >= 2) {
            const name = $(columns[0]).text().trim();
            const availabilityStr = $(columns[1]).text().trim().replace(',', '.');
            const availability = parseFloat(availabilityStr);

            if (name && !isNaN(availability)) {
                banks.push({ name, availability });
            }
        }
    });

    return banks;
}

function formatBanksData(banks: BankData[]): string {
    let result = '<b>Текущая доступность банков:</b>\n\n';
    const maxNameLength = Math.max(...banks.map(b => b.name.length));

    const availabilityThreshold = parseFloat(process.env.AVAILABILITY_PERCENT || "0");

    banks.forEach(bank => {
        const availabilityColor = bank.availability < availabilityThreshold ? '🔴' : '🟢';
        const paddedName = bank.name.padEnd(maxNameLength, ' ');
        result += `<code>${availabilityColor} ${paddedName} | ${bank.availability.toFixed(2)}%</code>\n`;
    });

    result += `\n<i>🔴 - доступность ниже ${availabilityThreshold}%</i>`;

    return result;
}


async function checkAndNotifyLowAvailability(banks: BankData[]) {


    if (!availabilityThresholdString) {
        console.error('Ошибка: AVAILABILITY_PERCENT не задано!');
        return;
    }

    const availabilityThreshold = parseFloat(availabilityThresholdString);

    if (isNaN(availabilityThreshold)) {
        console.error('Ошибка: AVAILABILITY_PERCENT некорректно задано!');
        return;
    }

    const problematicBanks = banks.filter(b => b.availability < availabilityThreshold);

    if (problematicBanks.length > 0) {
        let alertMessage = '⚠️ <b>ВНИМАНИЕ: Низкая доступность банков!</b>\n\n';

        problematicBanks.forEach(bank => {
            alertMessage += `▫️ <b>${bank.name}</b>: ${bank.availability.toFixed(2)}%\n`; // Исправлен синтаксис
        });

        alertMessage += `\n<i>Пороговое значение: ${availabilityThreshold}%</i>`; // Исправлен синтаксис
        if (!chatId) {
            console.error('Ошибка: TELEGRAM_CHAT_ID не задано!');
            return;
        }

        try {
            await bot.api.sendMessage(chatId, alertMessage, { parse_mode: 'HTML' });
            console.log('Отправлено уведомление о низкой доступности');
        } catch (error) {
            console.error('Ошибка отправки уведомления:', error);
        }
    }
}


setInterval(async () => {
    try {
        console.log('Выполняю периодическую проверку банков...');
        const banksData = await fetchBanksData();
        await checkAndNotifyLowAvailability(banksData);
    } catch (error) {
        console.error('Ошибка при периодической проверке:', error);
    }
}, 20 * 1000); // каждые 30 минут


bot.start().then(async () => {
    console.log('Бот запущен');
    await sendStartupNotification();
}).catch((error) => {
    console.error('Ошибка при запуске бота:');

    if (error instanceof Error) {
        console.error(error.message);

        // Дополнительная информация для Telegram API ошибок
        if ('response' in error) {
            console.error('Response data:', (error as any).response?.data);
        }
    } else {
        console.error(error);
    }
});