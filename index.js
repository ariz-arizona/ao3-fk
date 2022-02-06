require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const { getRandomInt, array_chunks } = require('./helpers');
const { searchWorkPage, getWorkData, makeWorkAnswer, showError, makeWorksUrl } = require('./func');
const { fkTagYears, fkTag, winterFkTag, ao3Url, fkTagCollections } = require('./constants');

const { BOT_TOKEN, CURRENT_HOST = 'https://ao3-fk-ariz-arizona.vercel.app' } = process.env;
const APP_PORT = 443;

const app = express();

const bot = new TelegramBot(BOT_TOKEN);
bot.setWebHook(`${CURRENT_HOST}/callback`, { allowed_updates: ["message", "edited_message", "callback_query", "inline_query"] });

//todo продолжать работу при ошибке парсинга
//todo ссылка на скачивание вместо урл страницы ??

let additionalTag = fkTagYears['w2022'];
let seasonTag = winterFkTag;

const setFunction = async (chatId) => {
    await bot.sendMessage(
        chatId,
        'Выберите битву:',
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '2020', callback_data: 'set_2020' },
                        { text: 'Winter 2020', callback_data: 'set_w2020_w' },
                    ],
                    [
                        { text: '2021', callback_data: 'set_2021' },
                        { text: 'Winter 2021', callback_data: 'set_w2021_w' },
                    ],
                    [
                        { text: 'Winter 2022', callback_data: 'set_w2022_w' },
                    ],
                    [
                        { text: 'ВСЕ БИТВЫ', callback_data: 'set_fkall' },
                        { text: 'ВСЕ ЗИМНИЕ БИТВЫ', callback_data: 'set_fkall_w' }
                    ]
                ]
            }
        }
    );

    return true;
};

const citFunction = async (chatId) => {
    const queryAttrs = {
        'work_search%5Bwords_from%5D': 100
    };

    if (additionalTag) {
        queryAttrs['work_search%5Bother_tag_names%5D'] = additionalTag;
    }

    const techMsg = await bot.sendMessage(chatId, 'Открываю все работы');
    const techMsgId = techMsg.message_id;

    const worksUrl = makeWorksUrl(seasonTag);

    const { dom, randomWorkUrl } = await searchWorkPage(bot, chatId, worksUrl, techMsgId, queryAttrs);
    const { fandom, title, downloadLink, summary } = await getWorkData(dom);

    const paragraphs = dom.querySelectorAll('#chapters .userstuff p');

    bot.editMessageText('Ищу случайный абзац', { chat_id: chatId, message_id: techMsgId });

    let randomParagraph, randomParagraphText;
    let i = 0;

    do {
        randomParagraph = getRandomInt(0, paragraphs.length - 1);
        randomParagraphText = paragraphs[randomParagraph].textContent.trim().substring(0, 2048);

        if (randomParagraphText === '') {
            paragraphs.splice(randomParagraph, 1)
        }

        bot.editMessageText(`Ищу случайный абзац ${i + 1} раз`, { chat_id: chatId, message_id: techMsgId });
        i++;
    } while (randomParagraphText === '' && i < 5)

    bot.editMessageText('Все нашел!', { chat_id: chatId, message_id: techMsgId });

    const text = makeWorkAnswer(title, fandom, summary);

    await bot.sendMessage(
        chatId,
        text.join('\n\n'),
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Работа на AO3', url: `${ao3Url}${randomWorkUrl}` },
                        { text: 'EPUB', url: `${ao3Url}${downloadLink}` }
                    ]
                ]
            }
        })
        .then(() => {
            console.log(randomWorkUrl, downloadLink)
            return bot.sendMessage(
                chatId,
                `<b>Случайный параграф</b>\n${randomParagraphText}`,
                {
                    parse_mode: 'HTML',
                }
            );
        });

    return true;
};

const picFunction = async (chatId) => {
    const queryAttrs = {
        'work_search%5Bwords_to%5D': 100
    };

    if (additionalTag) {
        queryAttrs['work_search%5Bother_tag_names%5D'] = additionalTag;
    }

    const techMsg = await bot.sendMessage(chatId, 'Открываю все работы')
    const techMsgId = techMsg.message_id;

    const worksUrl = makeWorksUrl(seasonTag);

    const { dom, randomWorkUrl } = await searchWorkPage(bot, chatId, worksUrl, techMsgId, queryAttrs);
    const { fandom, title, summary } = await getWorkData(dom);

    //если картинка очень большая - не грузить, давать ссылку
    const mediaElements = dom.querySelectorAll('#chapters .userstuff img, #chapters .userstuff iframe');
    const images = [];
    const otherLinks = [];

    if (mediaElements.length > 0) {
        mediaElements.forEach(item => {
            if (item.tagName === 'IMG') {
                images.push({
                    type: 'photo',
                    media: item.getAttribute('src')
                })
            } else {
                otherLinks.push(item.getAttribute('src'));
            }
        })
    }

    const media = array_chunks(images, 10);

    const text = makeWorkAnswer(title, fandom, summary);

    bot.editMessageText('Все нашел!', { chat_id: chatId, message_id: techMsgId });
    console.log(`Для чат айди ${chatId} загружена работа ${randomWorkUrl}`);

    await bot.sendMessage(
        chatId,
        text.join('\n\n'),
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Работа на AO3', url: `${ao3Url}${randomWorkUrl}` },
                    ]
                ]
            }
        })
        .then(() => {
            if (otherLinks.length) {
                otherLinks.forEach(link => {
                    return bot.sendMessage(chatId, `Я нашел видео, посмотрите его по ссылке:\n${link}`);
                })
            }
            media.forEach(img => {
                return bot.sendMediaGroup(chatId, img);
            })
        });

    return true;
};

const collectionFunction = async (chatId) => {
    await bot.sendMessage(
        chatId,
        'Выберите битву:',
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'FandomKombat2021', callback_data: 'collection_2021' },
                        { text: 'FandomKombat2020', callback_data: 'collection_2020' },
                    ],
                    [
                        { text: 'WTFKombat2021', callback_data: 'collection_w2021' },
                        { text: 'WTFKombat2022', callback_data: 'collection_w2022' },
                    ],
                ]
            }
        }
    );
    return true;
}

const onCallbackQuery = async (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    // message_id: msg.message_id,

    if (action.indexOf('set_') === 0) {
        const vars = action.replace('set_', '').split('_');
        additionalTag = fkTagYears[vars[0]];

        if (vars[1] === 'w') {
            seasonTag = winterFkTag;
        } else {
            seasonTag = fkTag;
        }

        bot.sendMessage(chatId, 'Погадаем?', {
            reply_markup: {
                keyboard: [
                    ['/cit', '/pic']
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        })
    }

    if (action.indexOf('collection_') === 0) {
        const vars = action.replace('collection_', '').split('_');
        const collection = fkTagCollections[vars[0]];

        const url = `${ao3Url}/collections/${collection}/collections`;

        let content;
        let dom;
        content = await loadPage(url);
        dom = HTMLParser.parse(content);

        if (!dom.querySelector('.collection .stats dd:nth-child(4)')) {
            throw new Error('notfound');
        }

        const domLinks = dom.querySelector('.collection .stats dd:nth-child(4)');
        const links = [];
        domLinks.forEach(el => {
            const link = {};
            link.name = el.closest('.collection').querySelector('.heading > a').textContent;
            link.href = el.querySelector('a').getAttribute('href');
            links.push(link);
        });

        linksChunks = array_chunks(links, 3);
        const keyboard = [];
        linksChunks.map(el => {
            const row = [];
            el.map(link => {
                row.push({ text: link.name, callback_data: `link_${link.href}` },)
            })
            keyboard.push(row);
        });

        bot.sendMessage(chatId, 'Заглядываю в коллекции', {
            reply_markup: {
                inline_keyboard: keyboard
            }
        })
    }

    return bot.answerCallbackQuery(callbackQuery.id);
}

bot.onText(/\/set/, setFunction);
bot.onText(/\/pic/, picFunction);
bot.onText(/\/cit/, citFunction);;
bot.onText(/\/collection/, collectionFunction)
bot.on('callback_query', onCallbackQuery);

bot.on('error', (error) => {
    console.log(error.code);
});

bot.on('polling_error', (error) => {
    console.log(error);
});

app.use(express.json());

app.get('/', async (_req, res) => {
    // const url = `${CURRENT_HOST}/callback`;
    // await bot.setWebHook(url, { allowed_updates: ["message", "edited_message", "callback_query", "inline_query"] });
    res.send(`listening on ${CURRENT_HOST}`)
});

app.post(`/callback`, async (_req, res) => {
    // console.log(_req.body);

    if (_req.body.message) {
        const msgText = _req.body.message.text;
        const chatId = _req.body.message.chat.id;
        const date = _req.body.message.date;
        console.log(`Сделан запрос ${msgText} от чат айди ${chatId}`);
        try {
            if (/\/set/.test(msgText)) {
                await setFunction(chatId);
            }

            if (/\/cit/.test(msgText)) {
                await citFunction(chatId);
            }

            if (/\/pic/.test(msgText)) {
                await picFunction(chatId);
            }

            if (/\/collection/.test(msgText)) {
                await collectionFunction(chatId);
            }
        } catch (error) {
            showError(bot, chatId, error);
        }
    } else if (_req.body.callback_query) {
        onCallbackQuery(_req.body.callback_query)
    }
    // bot.processUpdate(_req.body);

    res.sendStatus(200);
});

app.listen(APP_PORT, () => {
    console.log(`listening on ${APP_PORT}`)
});