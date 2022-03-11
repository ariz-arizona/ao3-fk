const router = require('express').Router();

const TelegramBot = require('node-telegram-bot-api');

const { fkTagYears, winterFkTag } = require('../config/constants');
const { set, cit, pic, collection, onCallbackQuery } = require('../functions/main');
const { showError } = require('../functions/func');

const { BOT_TOKEN, CURRENT_HOST } = process.env;

const bot = new TelegramBot(BOT_TOKEN);
bot.setWebHook(`${CURRENT_HOST}/callback`, { allowed_updates: ["message", "edited_message", "callback_query", "inline_query"] });

global.bot = bot;

global.additionalTag = fkTagYears['w2022'];
global.seasonTag = winterFkTag;

bot.on('error', (error) => {
    console.log(error.code);
});

bot.on('polling_error', (error) => {
    console.log(error.code);
});

router.post(`/callback`, async (_req, res) => {
    if (_req.body.message) {
        const msgText = _req.body.message.text;
        const chatId = _req.body.message.chat.id;
        // const date = _req.body.message.date;

        if (!global.chatId) {
            global.chatId = chatId;
        }

        console.log(`Сделан запрос ${msgText} от чат айди ${chatId}`);
        try {
            if (/\/set/.test(msgText)) {
                await set();
            }

            if (/\/cit/.test(msgText)) {
                await cit();
            }

            if (/\/pic/.test(msgText)) {
                await pic();
            }

            if (/\/collection/.test(msgText)) {
                await collection();
            }
        } catch (error) {
            showError(error);
        }
    } else if (_req.body.callback_query) {
        await onCallbackQuery(_req.body.callback_query);
    }

    res.sendStatus(200);
});

module.exports = router;