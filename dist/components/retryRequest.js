import axios from "axios";
async function fetchWithRetry(url, options = {}) {
    const { retries = 3, timeout = 5000 } = options;
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(url, {
                timeout,
                signal: AbortSignal.timeout(timeout)
            });
            return response.data;
        }
        catch (error) { // Явно указываем тип unknown
            if (error instanceof Error) {
                lastError = error;
                console.warn(`Попытка ${attempt}/${retries} не удалась: ${error.message}`);
            }
            else {
                lastError = new Error(String(error));
                console.warn(`Попытка ${attempt}/${retries} не удалась: неизвестная ошибка`);
            }
            if (attempt < retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError || new Error('Неизвестная ошибка при выполнении запроса');
}
export { fetchWithRetry };
