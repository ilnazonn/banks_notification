import { bot } from './config.js';
import { fetchBanksData, formatBanksData } from './parseSite.js';
import { checkAndNotifyLowAvailability } from './intervalNotification.js';
import { exec } from "child_process";
bot.command('banks', async (ctx) => {
    try {
        await ctx.reply('Запрашиваю текущие данные о банках...');
        const banksData = await fetchBanksData();
        const formattedData = formatBanksData(banksData);
        await ctx.reply(formattedData, { parse_mode: 'HTML' });
        await checkAndNotifyLowAvailability(banksData);
    }
    catch (error) {
        console.error('Ошибка:', error);
        await ctx.reply('Произошла ошибка при получении данных.');
    }
});
bot.hears('/restart', async (ctx) => {
    const userId = ctx.from?.id;
    if (userId !== undefined) {
        exec('pm2 restart notification_bot', (error, _stdout, stderr) => {
            if (error) {
                ctx.reply(`Ошибка при перезапуске: ${stderr}`);
                console.error(`Ошибка при перезапуске: ${error.message}`);
            }
            else {
                ctx.reply('Процесс статистики успешно перезапущен.');
                console.log('Процесс статистики успешно перезапущен разрешенному пользователю');
            }
        });
    }
    else {
        await ctx.reply('У вас нет доступа к этому боту.');
        console.log('Попытка перезапуска от неразрешенного пользователя');
    }
});
bot.command('status', async (ctx) => {
    const userId = ctx.from?.id;
    if (userId !== undefined) {
        try {
            const { stdout, stderr } = await execPromise('pm2 describe notification_bot');
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                await ctx.reply(`Ошибка: ${stderr}`);
                return;
            }
            // Форматирование статуса приложения в markdown
            const formattedOutput = `Статус приложения:\n\`\`\`\n${stdout.trim()}\n\`\`\``;
            await ctx.reply(formattedOutput, { parse_mode: 'Markdown' });
        }
        catch (error) {
            const err = error; // Приведение типа
            console.error(`Ошибка получения статуса: ${err.message}`);
            await ctx.reply(`Ошибка при получении статуса: ${err.message}`);
        }
    }
    else {
        await ctx.reply('У вас нет доступа к этому боту.');
        console.log('Попытка получения статуса от неразрешенного пользователя');
    }
});
// Функция для обертки exec в промис с правильными типами
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}
