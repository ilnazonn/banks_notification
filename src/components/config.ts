import {Bot} from "grammy";
import dotenv from 'dotenv';
dotenv.config();
interface BankData {
    name: string;
    availability: number;
}

export const token = process.env.BOT_TOKEN;
export const bot = new Bot(token as string);
export const chatId = process.env.TELEGRAM_CHAT_ID;
export const availabilityThresholdString = process.env.AVAILABILITY_PERCENT;

export { BankData };