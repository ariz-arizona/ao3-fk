const HTMLParser = require('node-html-parser');

const { worksUrl, ao3Url } = require('./constants');
const { getRandomInt, makeQueryString, getSearchParametres, loadPage } = require('./helpers');

//todo глобальные переменные?
const searchWorkPage = async (bot, chatId, techMsgId, queryAttrs) => {
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
    text.push(`<b><a href="${ao3Url}${downloadLink}">EPUB</></b>`);
    summary ? text.push(`<b>Саммари</b>: ${summary}`) : null;
    text.push(`<b><a href="${ao3Url}${randomWorkUrl}">Документ</a></b>`);

    return text;
}

const showError = (bot, chatId, error) => {
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

module.exports = { searchWorkPage, getWorkData, makeWorkAnswer, showError }