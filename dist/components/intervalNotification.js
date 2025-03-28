import { bot, chatId, availabilityThresholdString } from './config.js';
import { fetchBanksData } from './parseSite.js';
const bankStatusMap = {};
async function checkAndNotifyLowAvailability(banks) {
    if (!availabilityThresholdString || !chatId) {
        console.error('Проверьте настройки: AVAILABILITY_PERCENT или TELEGRAM_CHAT_ID не заданы!');
        return;
    }
    const availabilityThreshold = parseFloat(availabilityThresholdString);
    if (isNaN(availabilityThreshold)) {
        console.error('Некорректное значение AVAILABILITY_PERCENT');
        return;
    }
    const currentTime = Date.now();
    const checkerTime = 10 * 60 * 1000;
    const problematicBanksNow = banks.filter(b => b.availability < availabilityThreshold);
    const stableBanksNow = banks.filter(b => b.availability >= availabilityThreshold);
    // Обработка проблемных банков
    const banksToNotify = [];
    problematicBanksNow.forEach(bank => {
        const bankKey = bank.name;
        if (!bankStatusMap[bankKey]) {
            // Первое обнаружение проблемы
            bankStatusMap[bankKey] = {
                firstDetectedTime: currentTime,
                notificationSent: false,
                resolvedTime: null
            };
            console.log(`Проблема обнаружена в ${bank.name}`);
        }
        else if (!bankStatusMap[bankKey].notificationSent) {
            // Проверяем длительность проблемы
            const problemDuration = currentTime - bankStatusMap[bankKey].firstDetectedTime;
            if (problemDuration >= checkerTime) {
                banksToNotify.push(bank);
                bankStatusMap[bankKey].notificationSent = true;
                bankStatusMap[bankKey].resolvedTime = null;
            }
        }
    });
    // Обработка стабильных банков
    const banksToResolveNotify = [];
    stableBanksNow.forEach(bank => {
        const bankKey = bank.name;
        if (bankStatusMap[bankKey]?.notificationSent) {
            // Банк был проблемным и уведомление отправлялось
            if (!bankStatusMap[bankKey].resolvedTime) {
                // Первое обнаружение стабильности
                bankStatusMap[bankKey].resolvedTime = currentTime;
                console.log(`Проблема устранена в ${bank.name}, начат отсчет стабильности`);
            }
            else {
                // Проверяем длительность стабильности
                const stableDuration = currentTime - bankStatusMap[bankKey].resolvedTime;
                if (stableDuration >= checkerTime) {
                    banksToResolveNotify.push(bankKey);
                    delete bankStatusMap[bankKey]; // Сбрасываем статус
                }
            }
        }
    });
    // Отправка уведомлений о проблемах
    if (banksToNotify.length > 0) {
        let alertMessage = '⚠️ <b>ВНИМАНИЕ: Критически низкая доступность банков!</b>\n\n';
        banksToNotify.forEach(bank => {
            alertMessage += `▫️ <b>${bank.name}</b>: ${bank.availability.toFixed(2)}%\n`;
        });
        alertMessage += `\n<i>Проблема длится более 10 минут. Пороговое значение: ${availabilityThreshold}%</i>`;
        try {
            await bot.api.sendMessage(chatId, alertMessage, { parse_mode: 'HTML' });
            console.log('Отправлено уведомление о проблемах');
        }
        catch (error) {
            console.error('Ошибка отправки:', error);
        }
    }
    // Отправка уведомлений о решении проблем
    if (banksToResolveNotify.length > 0) {
        let resolveMessage = '✅ <b>Проблемы с доступностью банков решены!</b>\n\n';
        banksToResolveNotify.forEach(bankName => {
            resolveMessage += `▫️ <b>${bankName}</b>: доступность восстановлена\n`;
        });
        resolveMessage += `\n<i>Стабильная работа более 10 минут. Пороговое значение: ${availabilityThreshold}%</i>`;
        try {
            await bot.api.sendMessage(chatId, resolveMessage, { parse_mode: 'HTML' });
            console.log('Отправлено уведомление о решении проблем');
        }
        catch (error) {
            console.error('Ошибка отправки:', error);
        }
    }
    // Очистка статусов для банков, которые больше не существуют
    Object.keys(bankStatusMap).forEach(bankKey => {
        if (!banks.some(b => b.name === bankKey)) {
            delete bankStatusMap[bankKey];
        }
    });
}
setInterval(async () => {
    try {
        console.log('Выполняю периодическую проверку банков...');
        const banksData = await fetchBanksData();
        await checkAndNotifyLowAvailability(banksData);
    }
    catch (error) {
        console.error('Ошибка при периодической проверке:', error);
    }
}, 60 * 1000); // таймер
export { checkAndNotifyLowAvailability };
