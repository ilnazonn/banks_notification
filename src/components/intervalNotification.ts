import {bot,chatId, availabilityThresholdString, BankData} from './config.js';
import {fetchBanksData} from './parseSite.js';
// Глобальный объект для хранения времени первого обнаружения проблемы
const bankProblemTimers: Record<string, number> = {};

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

    if (!chatId) {
        console.error('Ошибка: TELEGRAM_CHAT_ID не задано!');
        return;
    }

    const currentTime = Date.now();
    const tenMinutesInMs = 2 * 60 * 1000;
    const problematicBanksNow = banks.filter(b => b.availability < availabilityThreshold);
    const banksToNotify: BankData[] = [];

    // Проверяем каждую проблемную запись
    problematicBanksNow.forEach(bank => {
        const bankKey = bank.name;

        if (!bankProblemTimers[bankKey]) {
            // Первое обнаружение проблемы - записываем время
            bankProblemTimers[bankKey] = currentTime;
            console.log(`Проблема обнаружена в ${bank.name}, начало отсчета`);
        } else {
            // Проблема уже была обнаружена ранее
            const problemDuration = currentTime - bankProblemTimers[bankKey];

            if (problemDuration >= tenMinutesInMs) {
                banksToNotify.push(bank);
                // Сбрасываем таймер после уведомления
                delete bankProblemTimers[bankKey];
            }
        }
    });

    // Очищаем таймеры для банков, которые больше не проблемные
    Object.keys(bankProblemTimers).forEach(bankKey => {
        if (!problematicBanksNow.some(b => b.name === bankKey)) {
            delete bankProblemTimers[bankKey];
            console.log(`Проблема устранена в ${bankKey}, таймер сброшен`);
        }
    });

    // Отправляем уведомление если есть банки с проблемой >10 минут
    if (banksToNotify.length > 0) {
        let alertMessage = '⚠️ <b>ВНИМАНИЕ: Низкая доступность банков более 10 минут!</b>\n\n';

        banksToNotify.forEach(bank => {
            alertMessage += `▫️ <b>${bank.name}</b>: ${bank.availability.toFixed(2)}%\n`;
        });

        alertMessage += `\n<i>Пороговое значение: ${availabilityThreshold}%</i>`;

        try {
            await bot.api.sendMessage(chatId, alertMessage, { parse_mode: 'HTML' });
            console.log('Отправлено уведомление о длительной низкой доступности');
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
}, 60 * 1000); // таймер

export {checkAndNotifyLowAvailability};