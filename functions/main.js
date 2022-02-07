require('dotenv').config()
const HTMLParser = require('node-html-parser');

const { getRandomInt, array_chunks, loadPage, makeQueryString } = require('./helpers');
const { searchWorkPage, getWorkData, makeWorkAnswer, makeWorksUrl, getWorkImages, getRandomParagraph } = require('./func');
const { fkTagYears, fkTag, winterFkTag, ao3Url, fkTagCollections } = require('../constants');

const set = async () => {
    const bot = global.bot;
    const chatId = global.chatId;

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

const cit = async () => {
    const bot = global.bot;
    const chatId = global.chatId;

    const queryAttrs = {
        'work_search%5Bwords_from%5D': 100
    };

    if (global.additionalTag) {
        queryAttrs['work_search%5Bother_tag_names%5D'] = global.additionalTag;
    }

    const techMsg = await bot.sendMessage(chatId, 'Открываю все работы');
    const techMsgId = techMsg.message_id;

    const worksUrl = makeWorksUrl(global.seasonTag);

    const { dom, randomWorkUrl } = await searchWorkPage(chatId, worksUrl, techMsgId, queryAttrs);
    const { fandom, title, downloadLink, summary } = await getWorkData(dom);

    bot.editMessageText('Ищу случайный абзац', { chat_id: chatId, message_id: techMsgId });

    const randomParagraphText = getRandomParagraph(dom);

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

const pic = async () => {
    const bot = global.bot;
    const chatId = global.chatId;

    const queryAttrs = {
        'work_search%5Bwords_to%5D': 100
    };

    if (global.additionalTag) {
        queryAttrs['work_search%5Bother_tag_names%5D'] = global.additionalTag;
    }

    const techMsg = await bot.sendMessage(chatId, 'Открываю все работы')
    const techMsgId = techMsg.message_id;

    const worksUrl = makeWorksUrl(global.seasonTag);

    const { dom, randomWorkUrl } = await searchWorkPage(chatId, worksUrl, techMsgId, queryAttrs);
    const { fandom, title, summary } = await getWorkData(dom);

    const { media, otherLinks } = getWorkImages(dom);

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

const collection = async () => {
    const bot = global.bot;
    const chatId = global.chatId;

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
    const bot = global.bot;

    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    // message_id: msg.message_id,

    let content;
    let dom;

    if (action.indexOf('set_') === 0) {
        const vars = action.replace('set_', '').split('_');
        global.additionalTag = fkTagYears[vars[0]];

        if (vars[1] === 'w') {
            global.seasonTag = winterFkTag;
        } else {
            global.seasonTag = fkTag;
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

        content = await loadPage(url);
        dom = HTMLParser.parse(content);

        if (!dom.querySelector('.collection .stats dd:nth-child(4)')) {
            throw new Error('notfound');
        }

        const domLinks = dom.querySelectorAll('.collection .stats dd:nth-child(4)');
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

    if (action.indexOf('link_') === 0) {
        let queryAttrs;

        const vars = action.replace('link_', '');
        const url = `${ao3Url}${vars}`;

        content = await loadPage(url);
        dom = HTMLParser.parse(content);

        const pagesCount = dom.querySelector('.pagination li:nth-last-child(2)') ? dom.querySelector('.pagination li:nth-last-child(2)').textContent : 1;
        const randomPage = getRandomInt(1, pagesCount);

        queryAttrs = {
            'page': randomPage
        };

        content = await loadPage(`${url}${makeQueryString(queryAttrs)}`);
        dom = HTMLParser.parse(content);

        const allWorks = dom.querySelectorAll('ol.work > li');
        const randomWorkNumber = getRandomInt(0, allWorks.length - 1);
        const randomWork = allWorks[randomWorkNumber];

        const href = randomWork.querySelector('.heading > a').getAttribute('href');

        queryAttrs = {
            'view_full_work': 'true',
            'view_adult': 'true'
        };
        content = await loadPage(`${ao3Url}${href}${makeQueryString(queryAttrs)}`);
        dom = HTMLParser.parse(content);

        const { fandom, title, downloadLink, summary } = await getWorkData(dom);
        const text = makeWorkAnswer(title, fandom, summary);

        const randomParagraphText = getRandomParagraph(dom);
        const { media, otherLinks } = getWorkImages(dom);

        await bot.sendMessage(
            chatId,
            text.join('\n\n'),
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Работа на AO3', url: `${ao3Url}${href}` },
                            { text: 'EPUB', url: `${ao3Url}${downloadLink}` }
                        ]
                    ]
                }
            }).then(() => {
                if (otherLinks.length) {
                    otherLinks.forEach(link => {
                        return bot.sendMessage(chatId, `Я нашел видео, посмотрите его по ссылке:\n${link}`);
                    })
                }
                if (media.length) {
                    media.forEach(img => {
                        try {
                            bot.sendMediaGroup(chatId, img);
                        } catch (error) {
                            bot.sendMessage(chatId, img.join('\n'))
                        }
                    })
                }
                return bot.sendMessage(
                    chatId,
                    `<b>Случайный параграф</b>\n${randomParagraphText}`,
                    {
                        parse_mode: 'HTML',
                    }
                );
            });
    }

    return bot.answerCallbackQuery(callbackQuery.id);
}

module.exports = { set, cit, pic, collection, onCallbackQuery }