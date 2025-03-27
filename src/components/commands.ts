import {Context} from "grammy";
import {bot} from './config.js';
import {fetchBanksData, formatBanksData} from './parseSite.js';
import {checkAndNotifyLowAvailability} from './intervalNotification.js';
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