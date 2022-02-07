require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const { fkTagYears, winterFkTag } = require('./constants');
const { set, cit, pic, collection, onCallbackQuery } = require('./functions/main');

const { BOT_TOKEN, CURRENT_HOST } = process.env;
//todo port в переменные среды
const APP_PORT = 443;

const app = express();

const bot = new TelegramBot(BOT_TOKEN);
bot.setWebHook(`${CURRENT_HOST}/callback`, { allowed_updates: ["message", "edited_message", "callback_query", "inline_query"] });

global.bot = bot;

global.additionalTag = fkTagYears['w2022'];
global.seasonTag = winterFkTag;

/*
раз уж теперь все по вебхуку, эта часть пока не нужна
bot.onText(/\/set/, setFunction);
bot.onText(/\/pic/, picFunction);
bot.onText(/\/cit/, citFunction);;
bot.onText(/\/collection/, collectionFunction)
bot.on('callback_query', onCallbackQuery);
*/

bot.on('error', (error) => {
    console.log(error.code);
});

bot.on('polling_error', (error) => {
    console.log(error);
});

app.use(express.json());

app.get('/', async (_req, res) => {
    res.send(`listening on ${CURRENT_HOST}`)
});

app.post(`/callback`, async (_req, res) => {
    if (_req.body.message) {
        const msgText = _req.body.message.text;
        const chatId = _req.body.message.chat.id;
        // const date = _req.body.message.date;
        console.log(`Сделан запрос ${msgText} от чат айди ${chatId}`);
        try {
            if (/\/set/.test(msgText)) {
                await set(chatId);
            }

            if (/\/cit/.test(msgText)) {
                await cit(chatId);
            }

            if (/\/pic/.test(msgText)) {
                await pic(chatId);
            }

            if (/\/collection/.test(msgText)) {
                await collection(chatId);
            }
        } catch (error) {
            showError(bot, chatId, error);
        }
    } else if (_req.body.callback_query) {
        await onCallbackQuery(_req.body.callback_query);
    }

    res.sendStatus(200);
});

app.listen(APP_PORT, () => {
    console.log(`listening on ${APP_PORT}`)
});