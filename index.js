require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');

const { fkTagYears, winterFkTag, ao3Url } = require('./constants');
const { set, cit, pic, collection, onCallbackQuery } = require('./functions/main');
const { showError, makeWorkAnswer, makeWorksUrl, searchWorkPage, getRandomParagraph, getWorkImages, getWorkData } = require('./functions/func');

const { getRandomCit } = require('./dicsord');

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
    console.log(message)
    if (message.type === InteractionType.PING) {
        res.status(200).send({
            type: InteractionResponseType.PONG,
        });
    } else if (message.type === InteractionType.APPLICATION_COMMAND || message.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
        const queryAttrs = {
            // 'work_search%5Bwords_to%5D': 100
        };

        if (global.additionalTag) {
            queryAttrs['work_search%5Bother_tag_names%5D'] = global.additionalTag;
        }

        const worksUrl = makeWorksUrl(global.seasonTag);
        const { dom, randomWorkUrl } = await searchWorkPage(worksUrl, queryAttrs);

        const { fandom, title, downloadLink, summary } = await getWorkData(dom);
        const randomParagraphText = getRandomParagraph(dom).slice(0, 900);
        const { media, otherLinks } = getWorkImages(dom);
        const images = [];
        media.map(el => {
            el.map(img => {
                images.push(img.media)
            })
        })

        const embed = {
            type: 'rich',
            title: title,
            fandom: fandom,
            url: `${ao3Url}${randomWorkUrl}`,
            fields: [
                {
                    name: 'Фандом',
                    value: fandom,
                },
                {
                    name: 'Ссылка для скачивания',
                    value: `${ao3Url}${downloadLink}`,
                },
            ],
        }
        if (randomParagraphText) embed.fields.push({
            name: 'Случайный абзац',
            value: randomParagraphText
        });
        if (summary) embed.fields.push({
            name: 'Саммари',
            value: summary,
        });
        if (images.length) {
            embed.image = { url: images[0] };
            embed.fields.push({
                name: 'Картинки',
                value: images.join('\n'),
            });
        }
        if (otherLinks.length) embed.fields.push({
            name: 'Видео',
            value: otherLinks.join('\n'),
        });
        res.status(200).send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                embeds: [embed]
            }
        })
    } else {
        res.status(400).send({ error: "Unknown Type" });
    }
});

app.listen(APP_PORT, () => {
    console.log(`listening on ${APP_PORT}`)
});

// discord();