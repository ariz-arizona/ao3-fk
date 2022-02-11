require('dotenv').config({ path: 'dev.env' })
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
// const fetch = require('cross-fetch');
const fetch = require('@vercel/fetch')(require('cross-fetch'));
const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');

const { fkTagYears, winterFkTag, ao3Url, fkTagCollections } = require('./constants');
const { set, cit, pic, collection, onCallbackQuery, makeWorkDiscord, collectionFinderFunc, workParserFinder, makeWorkFunction, makeEmbed } = require('./functions/main');
const { showError, getWorkData, getRandomParagraph, getWorkImages } = require('./functions/func');

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

app.all('/random/:messageId', async (_req, res) => {
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

    // const { messageId } = _req.params;
    const message = _req.body;
    const { token } = message;
    const userId = message.guild_id ? message.member.user.id : message.user.id;

    await makeWorkDiscord(token, userId);
    res.sendStatus(200)
})

app.all('/collection/:messageId', async (_req, res) => {
    const message = _req.body;
    const { token } = message;
    // const userId = message.guild_id ? message.member.user.id : message.user.id;

    const collections = await collectionFinderFunc(fkTagCollections['w2022']);
    await fetch(`https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}/messages/@original`, {
        headers: { 'Content-Type': 'application/json' },
        method: "PATCH",
        body: JSON.stringify({
            content: `Начинаю искать коллекцию в ${fkTagCollections['w2022']}`,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: "collection_select",
                            options: collections.map(el => {
                                return {
                                    label: el.name,
                                    value: el.href,
                                }
                            }),
                            placeholder: "Choose collection",
                            min_values: 1,
                            max_values: 1
                        }
                    ]
                }
            ]
        })
    });

    res.sendStatus(200)
})

app.all('/collection_select/:messageId', async (_req, res) => {
    const message = _req.body;
    const { token } = message;
    const userId = message.guild_id ? message.member.user.id : message.user.id;

    const url = `${ao3Url}${message.data.values[0]}`;
    const { dom, href } = await workParserFinder(url);
    const { fandom, title, downloadLink, summary } = await getWorkData(dom);

    const randomParagraphText = getRandomParagraph(dom).slice(0, 900);
    const { media, otherLinks } = getWorkImages(dom);
    const images = [];
    media.map(el => {
        el.map(img => {
            images.push(img.media)
        })
    })

    const embed = makeEmbed(title, fandom, href, downloadLink, randomParagraphText, summary, images, otherLinks);

    await fetch(`https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}/messages/@original`, {
        headers: { 'Content-Type': 'application/json' },
        method: "PATCH",
        body: JSON.stringify({
            content: `Нашел работу ${href}`,
            components: [{
                type: 1,
                components: [
                    {
                        type: 3,
                        custom_id: "collection_select",
                        options: [{
                            default: true,
                            label: message.data.values[0],
                            value: message.data.values[0]
                        }],
                        placeholder: "Choose collection",
                        disabled: true
                    }
                ]
            }]
        })
    });

    await fetch(`https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}`, {
        headers: { 'Content-Type': 'application/json' },
        method: "post",
        body: JSON.stringify({
            content: userId ? `<@${userId}> спрашивал, и я нашел ответ:` : '',
            embeds: [embed]
        })
    });

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

    global.bot = false;
    global.chatId = false;

    const message = _req.body;

    if (message.type === InteractionType.PING) {
        res.status(200).send({
            type: InteractionResponseType.PONG,
        });
    } else if (
        message.type === InteractionType.APPLICATION_COMMAND
        || message.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE
        || message.type === InteractionType.MESSAGE_COMPONENT
    ) {
        try {
            const command = message.data.name || message.data.custom_id;

            switch (command) {
                case 'random':
                    fetch(`http${_req.headers.host === 'localhost:443' ? '' : 's'}://${_req.headers.host}/random/${message.id}`, {
                        method: 'post',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(message)
                    });

                    await new Promise(resolve => setTimeout(resolve, 200));

                    res.status(200).send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            flags: 1 << 6,
                            content: `Начинаю искать работу`
                        }
                    });
                    break;
                case 'collection':
                    fetch(`http${_req.headers.host === 'localhost:443' ? '' : 's'}://${_req.headers.host}/collection/${message.id}`, {
                        method: 'post',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(message)
                    });

                    await new Promise(resolve => setTimeout(resolve, 200));

                    res.status(200).send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            flags: 1 << 6,
                            content: `Начинаю искать коллекцию`
                        }
                    });
                    break;
                case 'collection_select':
                    fetch(`http${_req.headers.host === 'localhost:443' ? '' : 's'}://${_req.headers.host}/collection_select/${message.id}`, {
                        method: 'post',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(message)
                    });

                    await new Promise(resolve => setTimeout(resolve, 200));

                    res.status(200).send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            flags: 1 << 6,
                            content: `Начинаю искать работу`
                        }
                    });
                    break;
                default:
                    res.status(200).send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            flags: 1 << 6,
                            content: `Я этого не умею :(`
                        }
                    });
            }

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