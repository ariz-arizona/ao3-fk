require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const { getRandomInt, array_chunks } = require('./helpers');
const { searchWorkPage, getWorkData, makeWorkAnswer, showError, makeWorksUrl } = require('./func');
const { fkTagYears, fkTag, winterFkTag, ao3Url } = require('./constants');

const { BOT_TOKEN } = process.env;
const APP_PORT = 3000;
const CURRENT_HOST = 'https://ao3-fk-ariz-arizona.vercel.app';

const app = express();

const bot = new TelegramBot(BOT_TOKEN);

//todo продолжать работу при ошибке парсинга
//todo ссылка на скачивание вместо урл страницы ??

let additionalTag = fkTagYears['w2022'];
let seasonTag = winterFkTag;

bot.onText(/\/set/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`Сделан запрос set от чат айди ${chatId}`);

    try {
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
    } catch (error) {
        bot.sendMessage(chatId, 'Ой! Что-то случилось! Может, попробуете еще раз?');
        console.log(`Ошибка в чате ${chatId}\n${error}`);
    }
})

bot.onText(/\/cit/, async (msg) => {
    bot.processUpdate(msg)
    const chatId = msg.chat.id;
    console.log(`Сделан запрос cit от чат айди ${chatId}`);

    try {
        const queryAttrs = {
            'work_search%5Bwords_from%5D': 100
        };
        
        if (additionalTag) {
            queryAttrs['work_search%5Bother_tag_names%5D'] = additionalTag;
        }
        console.log(queryAttrs);

        const techMsg = await bot.sendMessage(chatId, 'Открываю все работы');
        const techMsgId = techMsg.message_id;
        console.log(techMsgId);

        const worksUrl = makeWorksUrl(seasonTag);

        const { dom, randomWorkUrl } = await searchWorkPage(bot, chatId, worksUrl, techMsgId, queryAttrs);
        const { fandom, title, downloadLink, summary } = await getWorkData(dom);
        console.log(fandom);

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

        bot.sendMessage(
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

        if (process.memoryUsage().heapUsed > 200000000) {
            global.gc();
        }

    } catch (error) {
        showError(bot, chatId, error);
    }
});

bot.onText(/\/pic/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`Сделан запрос pic от чат айди ${chatId}`);

    try {
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
        const { fandom, title, downloadLink, summary } = await getWorkData(dom);

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

        bot.sendMessage(
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

        if (process.memoryUsage().heapUsed > 200000000) {
            global.gc();
        }
    } catch (error) {
        showError(bot, chatId, error);
    }
});

bot.onText(/\/collection/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`Сделан запрос collection от чат айди ${chatId}`);

    try {
    } catch (error) {
        showError(bot, chatId, error);
    }
})

bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    // message_id: msg.message_id,

    if (action.indexOf('set_') === 0) {
        const vars = action.replace('set_', '').split('_');
        additionalTag = fkTagYears[vars[0]];

        if (vars[1] === 'w') {
            seasonTag = winterFkTag;
        }

        bot.sendMessage(chatId, 'Погадаем?', {
            reply_markup: {
                keyboard: [['/cit', '/pic']],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        })
    }

    return bot.answerCallbackQuery(callbackQuery.id);
});

bot.on('error', (error) => {
    console.log(error.code);
});

bot.on('polling_error', (error) => {
    console.log(error);
});

app.use(express.json());

app.get('/', async (_req, res) => {
    const url = `${CURRENT_HOST}/callback`;
    await bot.setWebHook(url, { allowed_updates: ["message", "edited_message", "callback_query", "inline_query"] });
    res.send(`listening on ${CURRENT_HOST}`)
});

app.post('/callback', async (_req, res) => {
    // console.log(_req.body);
    await bot.processUpdate(_req.body);
    res.sendStatus(200);
});

app.listen(APP_PORT, () => {
    console.log(`listening on ${APP_PORT}`)
});