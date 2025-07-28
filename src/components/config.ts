import {Bot} from "grammy";
import dotenv from 'dotenv';
dotenv.config();

interface BankData {
    name: string;
    availability: number;
}

interface BankApiItem {
    bank_name: string;
    current_success_percent: number;
    unavailable_seconds_month: number;
    unavailable_seconds_year: number;
}

interface BankApiResponse {
    page_number: number;
    items_per_page: number;
    items_count: number;
    items: BankApiItem[];
    success: boolean;
}

export const token = process.env.BOT_TOKEN;
export const bot = new Bot(token as string);
export const chatId = process.env.TELEGRAM_CHAT_ID;
export const availabilityThresholdString = process.env.AVAILABILITY_PERCENT;

export { BankData, BankApiItem, BankApiResponse };