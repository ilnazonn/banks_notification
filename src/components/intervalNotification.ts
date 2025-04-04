import {bot,chatId, availabilityThresholdString, BankData} from './config.js';
import axios from "axios";
import {fetchBanksData} from './parseSite.js';
// Глобальный объект для хранения времени первого обнаружения проблемы
interface BankStatus {
    firstDetectedTime: number;
    notificationSent: boolean;
    resolvedTime: number | null;
}

const bankStatusMap: Record<string, BankStatus> = {};
let serverStatus = {
    errorCount: 0,
    lastErrorTime: 0,
    notificationSent: false
};
async function checkAndNotifyLowAvailability() {
    if (!availabilityThresholdString || !chatId) {
        console.error('Проверьте настройки: AVAILABILITY_PERCENT или TELEGRAM_CHAT_ID не заданы!');
        return;
    }

    const availabilityThreshold = parseFloat(availabilityThresholdString);
    if (isNaN(availabilityThreshold)) {
        console.error('Некорректное значение AVAILABILITY_PERCENT');
        return;
    }

    try {
        const banksData = await fetchBanksData();
        const currentTime = Date.now();
        const checkerTime = 10 * 60 * 1000;
        const problematicBanksNow = banksData.filter(b => b.availability < availabilityThreshold);
        const stableBanksNow = banksData.filter(b => b.availability >= availabilityThreshold);

        // Проверка восстановления сервера после проблем
        if (serverStatus.notificationSent) {
            const stableDuration = currentTime - serverStatus.lastErrorTime;
            if (stableDuration >= checkerTime) {
                await sendServerStatusNotification('✅ Сервер мониторинга банков стабильно работает\n\nПроблемы устранены, все системы функционируют нормально');
                serverStatus = {
                    errorCount: 0,
                    lastErrorTime: 0,
                    notificationSent: false
                };
            }
        }



        // Сброс счетчика ошибок при успешном запросе
        serverStatus.errorCount = 0;


        // Обработка проблемных банков
        const banksToNotify: BankData[] = [];

        problematicBanksNow.forEach(bank => {
            const bankKey = bank.name;

            if (!bankStatusMap[bankKey]) {
                bankStatusMap[bankKey] = {
                    firstDetectedTime: currentTime,
                    notificationSent: false,
                    resolvedTime: null
                };
                console.log(`Проблема обнаружена в ${bank.name}`);
            } else if (!bankStatusMap[bankKey].notificationSent) {
                const problemDuration = currentTime - bankStatusMap[bankKey].firstDetectedTime;

                if (problemDuration >= checkerTime) {
                    banksToNotify.push(bank);
                    bankStatusMap[bankKey].notificationSent = true;
                    bankStatusMap[bankKey].resolvedTime = null;
                }
            }
        });


        // Обработка стабильных банков
        const banksToResolveNotify: string[] = [];

        stableBanksNow.forEach(bank => {
            const bankKey = bank.name;

            if (bankStatusMap[bankKey]?.notificationSent) {
                if (!bankStatusMap[bankKey].resolvedTime) {
                    bankStatusMap[bankKey].resolvedTime = currentTime;
                    console.log(`Проблема устранена в ${bank.name}, начат отсчет стабильности`);
                } else {
                    const stableDuration = currentTime - bankStatusMap[bankKey].resolvedTime;

                    if (stableDuration >= checkerTime) {
                        banksToResolveNotify.push(bankKey);
                        delete bankStatusMap[bankKey];
                    }
                }
            }
        });

        // Восстановленная очистка статусов для несуществующих банков
        Object.keys(bankStatusMap).forEach(bankKey => {
            if (!banksData.some(b => b.name === bankKey)) {
                console.log(`Банк ${bankKey} больше не существует, очищаем статус`);
                delete bankStatusMap[bankKey];
            }
        });


        // Отправка уведомлений о проблемах
        if (banksToNotify.length > 0) {
            let alertMessage = '⚠️ <b>ВНИМАНИЕ: Критически низкая доступность банков!</b>\n\n';

            banksToNotify.forEach(bank => {
                alertMessage += `▫️ <b>${bank.name}</b>: ${bank.availability.toFixed(2)}%\n`;
            });

            alertMessage += `\n<i>Проблема длится более 10 минут. Порог: ${availabilityThreshold}%</i>`;

            try {
                await bot.api.sendMessage(chatId, alertMessage, { parse_mode: 'HTML' });
                console.log('Отправлено уведомление о проблемах');
            } catch (error) {
                console.error('Ошибка отправки уведомления о проблемах:', error);
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
            } catch (error) {
                console.error('Ошибка отправки уведомления о решениях:', error);
            }
        }

    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            serverStatus.errorCount++;
            serverStatus.lastErrorTime = Date.now();

            if (error.code === 'ETIMEDOUT') {
                console.error(`Таймаут подключения (попытка ${serverStatus.errorCount}/3)`);

                if (serverStatus.errorCount >= 3 && !serverStatus.notificationSent) {
                    await sendServerStatusNotification(
                        '⚠️ Проблемы с сервером мониторинга банков\n\n' +
                        'Не удается подключиться к серверу в течение 3 попыток\n' +
                        'Последняя ошибка: ' + error.message
                    );
                    serverStatus.notificationSent = true;
                }
            } else {
                console.error('Ошибка при запросе данных:', error.message);
            }
        } else {
            console.error('Неизвестная ошибка:', error instanceof Error ? error.message : String(error));
        }
    }
}

// Вспомогательная функция для уведомлений о проблемах сервера
async function sendServerStatusNotification(message: string) {
    try {
        await bot.api.sendMessage(
            chatId!,
            message,
            { parse_mode: 'HTML' }
        );
        console.log('Уведомление о состоянии сервера отправлено');
    } catch (error) {
        console.error('Ошибка отправки уведомления:', error);
    }
}
setInterval(async () => {
    try {
        console.log('Выполняю периодическую проверку банков...');
        await checkAndNotifyLowAvailability();
    } catch (error) {
        console.error('Ошибка при периодической проверке:', error);
    }
}, 60 * 1000); // таймер

export {checkAndNotifyLowAvailability};