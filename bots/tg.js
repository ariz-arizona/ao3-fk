const router = require('express').Router();

const TelegramBot = require('node-telegram-bot-api');

const { set, cit, pic, collection, onCallbackQuery } = require('../functions/main');
const { showError } = require('../functions/func');

const { TG_TOKEN, CURRENT_HOST } = process.env;

const bot = new TelegramBot(TG_TOKEN);
bot.setWebHook(`${CURRENT_HOST}/tg${TG_TOKEN.replace(':', '_')}`, { allowed_updates: ["message", "edited_message", "callback_query", "inline_query"] });

global.bot = bot;

bot.on('error', (error) => {
    console.log(error.code);
});

bot.on('polling_error', (error) => {
    console.log(error.code);
});

router.post(`/tg${TG_TOKEN.replace(':', '_')}`, async (_req, res) => {
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