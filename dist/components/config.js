import { Bot } from "grammy";
import dotenv from 'dotenv';
dotenv.config();
export const token = process.env.BOT_TOKEN;
export const bot = new Bot(token);
export const chatId = process.env.TELEGRAM_CHAT_ID;
export const availabilityThresholdString = process.env.AVAILABILITY_PERCENT;
