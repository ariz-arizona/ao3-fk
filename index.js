require('dotenv').config({ path: 'dev.env' })
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
// const fetch = require('cross-fetch');
const fetch = require('@vercel/fetch')(require('cross-fetch'));
const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');

const { fkTagYears, winterFkTag, ao3Url } = require('./constants');
const { set, cit, pic, collection, onCallbackQuery, makeWorkDiscord } = require('./functions/main');
const { showError } = require('./functions/func');

const { BOT_TOKEN, CURRENT_HOST, DISCORD_APPLICATION_ID } = process.env;
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
    console.log(error.code);
});

app.use(express.json({
    limit: '5mb',
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    },
}));

app.get('/', async (_req, res) => {
    res.send(`listening on ${CURRENT_HOST}`)
});

app.post(`/callback`, async (_req, res) => {
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

app.all('/random/:token/:userId', async (_req, res) => {
    // const signature = _req.headers['x-signature-ed25519'];
    // const timestamp = _req.headers['x-signature-timestamp'];
    // const isValidRequest = verifyKey(
    //     _req.rawBody,
    //     signature,
    //     timestamp,
    //     process.env.DISCORD_PUB_KEY
    // );

    // if (!isValidRequest) {
    //     return res.status(401).send({ error: 'Bad request signature ' });
    // }

    const { token, userId } = _req.params;
    if (!token) {
        return;
    }

    await makeWorkDiscord(token, userId);
    res.sendStatus(200)
})

app.post('/discord', async (_req, res) => {
    const signature = _req.headers['x-signature-ed25519'];
    const timestamp = _req.headers['x-signature-timestamp'];
    const isValidRequest = verifyKey(
        _req.rawBody,
        signature,
        timestamp,
        process.env.DISCORD_PUB_KEY
    );

    if (!isValidRequest) {
        return res.status(401).send({ error: 'Bad request signature ' });
    }

    const message = _req.body;

    if (message.type === InteractionType.PING) {
        res.status(200).send({
            type: InteractionResponseType.PONG,
        });
    } else if (message.type === InteractionType.APPLICATION_COMMAND || message.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
        try {
            fetch(`https://${_req.headers.host}/random/${message.token}/${message.user.id}`, { type: 'post' });
// console.log(message);
            await new Promise(resolve => setTimeout(resolve, 200));

            res.status(200).send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    flags: 1 << 6,
                    content: `Начинаю искать работу`
                }
            });
        } catch (error) {
            await fetch(`https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${message.token}`, {
                headers: { 'Content-Type': 'application/json' },
                method: "post",
                body: JSON.stringify({
                    content: 'Ой! Что-то случилось!'
                })
            });
            console.log(error)
            res.sendStatus(500)
        }
    } else {
        res.status(400).send({ error: "Unknown Type" });
    }
});

app.listen(APP_PORT, () => {
    console.log(`listening on ${APP_PORT}`)
});