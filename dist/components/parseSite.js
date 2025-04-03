import * as cheerio from "cheerio"; // Импортируйте все содержимое как пространство имен
import { fetchWithRetry } from './retryRequest.js';
async function fetchBanksData() {
    try {
        const url = 'https://vendista.ru/banks_availability';
        const html = await fetchWithRetry(url, {
            retries: 3,
            timeout: 10000 // 10 секунд таймаут
        });
        return parseBanksData(html);
    }
    catch (error) {
        console.error('Ошибка при получении данных:', error);
        throw new Error('Не удалось получить данные о банках');
    }
}
function parseBanksData(html) {
    const $ = cheerio.load(html);
    const banks = [];
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
