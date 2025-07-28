import { fetchWithRetry } from './retryRequest.js';
async function fetchBanksData() {
    try {
        const url = 'https://api.vendista.ru:99/banks/availability';
        const response = await fetchWithRetry(url, {
            retries: 3,
            timeout: 10000 // 10 секунд таймаут
        });
        return parseBanksData(response);
    }
    catch (error) {
        console.error('Ошибка при получении данных:', error);
        throw new Error('Не удалось получить данные о банках');
    }
}
function parseBanksData(apiResponse) {
    if (!apiResponse.success) {
        throw new Error('API вернул ошибку');
    }
    return apiResponse.items.map((item) => ({
        name: item.bank_name,
        availability: item.current_success_percent
    }));
}
function formatBanksData(banks) {
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
export { fetchBanksData, parseBanksData, formatBanksData };
