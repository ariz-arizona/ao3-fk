require('dotenv').config()
const HTMLParser = require('node-html-parser');
// const { default: fetch } = require('cross-fetch');
const fetch = require('@vercel/fetch')(require('cross-fetch'));

const { getRandomInt, array_chunks, loadPage, makeQueryString } = require('./helpers');
const { searchWorkPage, getWorkData, makeWorkAnswer, makeWorksUrl, getWorkImages, getRandomParagraph, techMsg } = require('./func');
const { fkTagYears, fkTag, winterFkTag, ao3Url, fkTagCollections } = require('../constants');

const { DISCORD_APPLICATION_ID } = process.env;

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

    techMsg('Открываю все работы', true);

    const worksUrl = makeWorksUrl(global.seasonTag);

    const { dom, randomWorkUrl } = await searchWorkPage(worksUrl, queryAttrs);
    const { fandom, title, downloadLink, summary } = await getWorkData(dom);

    techMsg('Ищу случайный абзац');

    const randomParagraphText = getRandomParagraph(dom);

    techMsg('Все нашел!');

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

    techMsg('Открываю все работы', true);

    const worksUrl = makeWorksUrl(global.seasonTag);

    const { dom, randomWorkUrl } = await searchWorkPage(worksUrl, queryAttrs);
    const { fandom, title, summary } = await getWorkData(dom);

    const { media, otherLinks } = getWorkImages(dom);

    const text = makeWorkAnswer(title, fandom, summary);

    techMsg('Все нашел!');
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
                bot.sendMediaGroup(chatId, img).then(() => { }, () => {
                    bot.sendMessage(chatId, `Не смог отправить картинки, поэтому вот ссылки:\n${img.map(el => el.media).join('\n')}`)
                })
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

const collectionFinderFunc = async (collection) => {
    const url = `${ao3Url}/collections/${collection}/collections`;

    techMsg('Собираю список коллекций', true);

    const content = await loadPage(url);
    const dom = HTMLParser.parse(content);

    if (!dom.querySelector('.collection .stats dd:nth-child(4)')) {
        throw new Error('notfound');
    }

    const domLinks = dom.querySelectorAll('.collection .stats dd:nth-child(4)');
    const links = [];
    domLinks.forEach(el => {
        if (el.closest('.collection').querySelector('.type').innerText.indexOf('Unrevealed') === -1) {
            const link = {};
            link.name = el.closest('.collection').querySelector('.heading > a').textContent;
            link.href = el.querySelector('a').getAttribute('href');
            links.push(link);
        }
    });

    return links;
}

const collectionFinder = async (collection) => {
    const chatId = global.chatId;

    const links = await collectionFinderFunc(collection);

    linksChunks = array_chunks(links, 2);
    const keyboard = [];
    linksChunks.map(el => {
        const row = [];
        el.map(link => {
            row.push({ text: link.name, callback_data: `link_${link.href}` },)
        })
        keyboard.push(row);
    });

    await bot.sendMessage(chatId, 'Заглядываю в коллекции', {
        reply_markup: {
            inline_keyboard: keyboard
        }
    });

    return true;
}

const workParserFinder = async (url) => {
    let content, dom, queryAttrs;

    techMsg('Открываю коллекцию', true);

    content = await loadPage(url);
    dom = HTMLParser.parse(content);

    const pagesCount = dom.querySelector('.pagination li:nth-last-child(2)') ? dom.querySelector('.pagination li:nth-last-child(2)').textContent : 1;
    const randomPage = getRandomInt(1, pagesCount);

    queryAttrs = {
        'page': randomPage
    };

    techMsg('Ищу случайную работу');

    content = await loadPage(`${url}${makeQueryString(queryAttrs)}`);
    dom = HTMLParser.parse(content);

    const allWorks = dom.querySelectorAll('ol.work > li');
    const randomWorkNumber = getRandomInt(0, allWorks.length - 1);
    const randomWork = allWorks[randomWorkNumber];

    const href = randomWork.querySelector('.heading > a').getAttribute('href');

    techMsg('Открываю случайную работу');

    queryAttrs = {
        'view_full_work': 'true',
        'view_adult': 'true'
    };
    content = await loadPage(`${ao3Url}${href}${makeQueryString(queryAttrs)}`);
    dom = HTMLParser.parse(content);

    return { dom, href };
}

const workParser = async (dom, href) => {
    const chatId = global.chatId;

    const { fandom, title, downloadLink, summary } = await getWorkData(dom);
    const text = makeWorkAnswer(title, fandom, summary);

    techMsg('Ищу отрывок');
    const randomParagraphText = getRandomParagraph(dom);

    techMsg('Ищу картинки');
    const { media, otherLinks } = getWorkImages(dom);

    techMsg('Все нашел!');

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
                    return bot.sendMediaGroup(chatId, img).then(() => { }, () => {
                        bot.sendMessage(chatId, `Не смог отправить картинки, поэтому вот ссылки:\n${img.map(el => el.media).join('\n')}`)
                    })
                })
            }
            if (randomParagraphText) {
                return bot.sendMessage(
                    chatId,
                    `<b>Случайный параграф</b>\n${randomParagraphText}`,
                    {
                        parse_mode: 'HTML',
                    }
                );
            }
        });
    return true;
}

const onCallbackQuery = async (callbackQuery) => {
    const bot = global.bot;

    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    // message_id: msg.message_id,

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

        await collectionFinder(collection);
    }

    if (action.indexOf('link_') === 0) {
        const vars = action.replace('link_', '');
        const url = `${ao3Url}${vars}`;
        const { dom, href } = await workParserFinder(url);

        await workParser(dom, href);
    }

    return bot.answerCallbackQuery(callbackQuery.id);
}

const makeWorkDiscord = async (token, userId, queryAttrs = {}) => {
    try {
        const queryAttrs = {
            // 'work_search%5Bwords_to%5D': 100
        }
        await fetch(`https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}/messages/@original`, {
            headers: { 'Content-Type': 'application/json' },
            method: "PATCH",
            body: JSON.stringify({
                content: `Начинаю искать случайную работу по тегам ${[global.additionalTag, global.seasonTag].join(', ')}`
            })
        })

        if (global.additionalTag) {
            queryAttrs['work_search%5Bother_tag_names%5D'] = global.additionalTag;
        }
        const worksUrl = makeWorksUrl(global.seasonTag);
        await makeWorkFunction(worksUrl, queryAttrs, token, userId);

        return true;
    } catch (error) {
        console.log(error)
    }
}

const makeEmbed = (title, fandom, randomWorkUrl, downloadLink, randomParagraphText, summary, images, otherLinks, author, tags) => {
    const embed = {
        type: 'rich',
        title: title,
        url: `${ao3Url}${randomWorkUrl}`,
        fields: [],
    }

    embed.fields.push({
        name: 'Фандом',
        value: fandom,
    });

    if (randomParagraphText) embed.fields.push({
        name: 'Случайный абзац',
        value: randomParagraphText
    });

    if (author && author.length) embed.fields.push({
        name: 'Автор',
        value: author.join(', ')
    });

    if (tags && tags.length) embed.fields.push({
        name: 'Тэги',
        value: tags.join(', ')
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

    embed.fields.push({
        name: 'Не забудьте про кудос',
        value: `${ao3Url}${randomWorkUrl}#new_kudo`,
    });

    return embed;
}

const makeWorkFunction = async (worksUrl, queryAttrs, token, userId) => {
    const { dom, randomWorkUrl } = await searchWorkPage(worksUrl, queryAttrs);

    await fetch(`https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}/messages/@original`, {
        headers: { 'Content-Type': 'application/json' },
        method: "PATCH",
        body: JSON.stringify({
            content: `Нашел работу ${randomWorkUrl}`
        })
    })

    const { fandom, title, downloadLink, summary, author, tags } = await getWorkData(dom);
    const randomParagraphText = getRandomParagraph(dom).slice(0, 900);
    const { media, otherLinks } = getWorkImages(dom);
    const images = [];
    media.map(el => {
        el.map(img => {
            images.push(img.media)
        })
    })

    const embed = makeEmbed(title, fandom, randomWorkUrl, downloadLink, randomParagraphText, summary, images, otherLinks, author, tags);

    await fetch(`https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}`, {
        headers: { 'Content-Type': 'application/json' },
        method: "post",
        body: JSON.stringify({
            content: userId ? `<@${userId}> спрашивал, и я нашел ответ:` : '',
            embeds: [embed]
        })
    });

    return true;
}

module.exports = { set, cit, pic, collection, collectionFinderFunc, workParserFinder, onCallbackQuery, makeWorkDiscord, makeEmbed, makeWorkFunction }