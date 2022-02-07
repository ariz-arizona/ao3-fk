const HTMLParser = require('node-html-parser');

const { ao3Url } = require('../constants');
const { getRandomInt, makeQueryString, getSearchParametres, loadPage, array_chunks } = require('./helpers');

//todo глобальные переменные?
const searchWorkPage = async (chatId, worksUrl, techMsgId, queryAttrs) => {
    const bot = global.bot;

    console.log(`search work page ${chatId}`)
    let pageQuery = {};
    let content;
    let dom;

    content = await loadPage(`${worksUrl}${makeQueryString(queryAttrs)}`);
    dom = HTMLParser.parse(content);

    if (!dom.querySelector('.pagination li:nth-last-child(2) a')) {
        throw new Error('notfound');
    }

    const lastPageUrl = dom.querySelector('.pagination li:nth-last-child(2) a').getAttribute('href');
    const searchParams = getSearchParametres(lastPageUrl);
    const randomPage = getRandomInt(1, searchParams.page);

    pageQuery = searchParams;
    pageQuery.page = randomPage;

    bot.editMessageText('Выбрал случайную страницу', { chat_id: chatId, message_id: techMsgId });

    const randomPageUrl = `${worksUrl}${makeQueryString(pageQuery)}`;

    content = await loadPage(`${randomPageUrl}`);
    dom = HTMLParser.parse(content);

    const worksCount = dom.querySelectorAll('.work > li').length - 1;
    const randomWork = getRandomInt(0, worksCount);
    const randomWorkUrl = dom.querySelectorAll('.work > li')[randomWork].querySelector('.heading > a').getAttribute('href');

    bot.editMessageText(`Выбрал случайную работу ${randomWorkUrl}`, { chat_id: chatId, message_id: techMsgId });
    console.log(`Для чат айди ${chatId} выбрана работа ${randomWorkUrl}`);

    content = await loadPage(`${ao3Url}${randomWorkUrl}${makeQueryString({ 'view_full_work': 'true', 'view_adult': 'true' })}`);
    dom = HTMLParser.parse(content);

    return { dom, randomWorkUrl };
}

const getWorkData = async (dom) => {
    const fandom = dom.querySelector('dd.fandom.tags').textContent.trim();
    const title = dom.querySelector('.title.heading').textContent.trim();
    const downloadLink = dom.querySelector('.download > ul > li:nth-child(2) > a').getAttribute('href');
    const summary = dom.querySelector('.summary .userstuff') ? dom.querySelector('.summary .userstuff').textContent.trim() : '';

    return { fandom, title, downloadLink, summary }
}

const makeWorkAnswer = (title, fandom, downloadLink, summary, randomWorkUrl) => {
    const text = ['<b>Случайная работа</b>', `<b>Название</b>: ${title}`, `<b>Фандом</b>: ${fandom}`];
    summary ? text.push(`<b>Саммари</b>: ${summary}`) : null;

    return text;
}

const getWorkImages = (dom) => {
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
    return { media, otherLinks };
}

const getRandomParagraph = dom => {
    const paragraphs = dom.querySelectorAll('#chapters .userstuff p');

    let randomParagraph, randomParagraphText;
    let i = 0;

    do {
        randomParagraph = getRandomInt(0, paragraphs.length - 1);
        randomParagraphText = paragraphs[randomParagraph].textContent.trim().substring(0, 2048);

        if (randomParagraphText === '') {
            paragraphs.splice(randomParagraph, 1)
        }

        // bot.editMessageText(`Ищу случайный абзац ${i + 1} раз`, { chat_id: chatId, message_id: techMsgId });
        i++;
    } while (randomParagraphText === '' && i < 5)

    return randomParagraphText;
}

const showError = (error) => {
    const bot = global.bot;
    const chatId = global.chatId;

    let msg;
    switch (error.message) {
        case 'notfound':
            msg = 'Я ничего не нашел :('
        default:
            msg = 'Ой! Что-то случилось! Может, попробуете еще раз?';
    }
    bot.sendMessage(chatId, msg);
    console.log(`Ошибка в чате ${chatId}\n${error}`);
}

const makeWorksUrl = (seasonTag) => {
    return `${ao3Url}/tags/${seasonTag}/works`
}

module.exports = { searchWorkPage, getWorkData, makeWorkAnswer, getWorkImages, getRandomParagraph, showError, makeWorksUrl }