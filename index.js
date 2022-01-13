require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const HTMLParser = require('node-html-parser');

const { getRandomInt, makeQueryString, getSearchParametres, closeWindow, loadPage } = require('./helpers');
const { BOT_TOKEN } = process.env;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const fkTag = 'Fandom%20Kombat';
const fkTag2021 = 'Fandom%20Kombat%202021';
const ao3Url = 'https://archiveofourown.org';

const worksUrl = `${ao3Url}/tags/${fkTag2021}/works`;

//todo продолжать работу при ошибке парсинга
//todo ссылка на скачивание вместо урл страницы ??

bot.onText(/\/cit/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`Сделан запрос от чат айди ${chatId}`);

    try {
        const queryAttrs = {
            'work_search%5Bwords_from%5D': 100
        };

        let pageQuery = {};

        let techMsgId;
        bot.sendMessage(chatId, 'Открываю все работы').then(msg => {
            techMsgId = msg.message_id;
        });

        let content;
        let dom;

        content = await loadPage(`${worksUrl}${makeQueryString(queryAttrs)}`);
        dom = HTMLParser.parse(content);

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

        bot.editMessageText('Выбрал случайную работу', { chat_id: chatId, message_id: techMsgId });
        console.log(`Для чат айди ${chatId} выбрана работа ${randomWorkUrl}`);

        // if (process.memoryUsage().heapUsed > 200000000) {
            global.gc();
        // }

        content = await loadPage(`${ao3Url}${randomWorkUrl}${makeQueryString({ 'view_full_work': 'true', 'view_adult': 'true' })}`);
        dom = HTMLParser.parse(content);

        const fandom = dom.querySelector('dd.fandom.tags').textContent.trim();
        const title = dom.querySelector('.title.heading').textContent.trim();
        const downloadLink = dom.querySelector('.download > ul > li:nth-child(2) > a').getAttribute('href');
        const summary = dom.querySelector('.summary .userstuff') ? dom.querySelector('.summary .userstuff').textContent.trim() : '';
        const paragraphs = dom.querySelectorAll('#chapters .userstuff > p');

        bot.editMessageText('Ищу случайный абзац', { chat_id: chatId, message_id: techMsgId });

        let randomParagraph, randomParagraphText;
        let i = 0;
        const paragraphsCount = paragraphs.length - 1;

        do {
            randomParagraph = getRandomInt(0, paragraphsCount);
            randomParagraphText = paragraphs[randomParagraph].textContent.trim().substring(0, 2048);
            bot.editMessageText(`Ищу случайный абзац ${i + 1} раз`, { chat_id: chatId, message_id: techMsgId });
            i++;
        } while (randomParagraphText === '' || i > 5)

        bot.editMessageText('Все нашел!', { chat_id: chatId, message_id: techMsgId });
        console.log(`Для чат айди ${chatId} загружена работа ${randomWorkUrl}`);

        bot.sendMessage(
            chatId,
            `<b>Случайная работа</b>\n\n<b>Название</b>: ${title}\n\n<b>Фандом</b>: ${fandom}\n\n<b><a href="${ao3Url}${downloadLink}">EPUB</></b>\n\n<b>Саммари</b>: ${summary}\n\n<b><a href="${ao3Url}${randomWorkUrl}">Документ</a></b>`,
            { parse_mode: 'HTML' }
        ).then(
            () => {
                return bot.sendMessage(
                    chatId,
                    `<b>Случайный параграф</b>\n${randomParagraphText}`,
                    { parse_mode: 'HTML' }
                );
            }
        );

        if (process.memoryUsage().heapUsed > 200000000) {
            global.gc();
        }

    } catch (error) {
        bot.sendMessage(chatId, 'Ой! Что-то случилось! Может, попробуете еще раз?');
        console.log(`Ошибка в чате ${chatId}\n${error}`);
    }
});

bot.on('error', (error) => {
    console.log(error.code);
});

bot.on('polling_error', (error) => {
    console.log(error);
});