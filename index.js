require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const jsdom = require("jsdom");

const { getRandomInt, makeQueryString, getSearchParametres } = require('./helpers');
const { BOT_TOKEN } = process.env;
const { JSDOM } = jsdom;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const fkTag = 'Fandom%20Kombat';
const fkTag2021 = 'Fandom%20Kombat%202021';
const ao3Url = 'https://archiveofourown.org';

const worksUrl = `${ao3Url}/tags/${fkTag2021}/works`;

//todo продолжать работу при ошибке парсинга
//todo ссылка на скачивание вместо урл страницы ??

bot.onText(/\/cit/, async (msg) => {
    const chatId = msg.chat.id;

    const queryAttrs = {
        'work_search%5Bwords_from%5D': 100
    };

    let pageQuery = {};

    await JSDOM.fromURL(`${worksUrl}${makeQueryString(queryAttrs)}`).then(dom => {
        const lastPageUrl = dom.window.document.querySelector('.pagination li:nth-last-child(2) a').href;

        const searchParams = getSearchParametres(lastPageUrl);
        const randomPage = getRandomInt(1, searchParams.page);

        pageQuery = searchParams;
        pageQuery.page = randomPage;
    });

    let randomWorkUrl;
    const randomPageUrl = `${worksUrl}${makeQueryString(pageQuery)}`;

    await JSDOM.fromURL(`${randomPageUrl}`).then(dom => {
        const worksCount = dom.window.document.querySelectorAll('.work > li').length - 1;
        const randomWork = getRandomInt(0, worksCount);
        randomWorkUrl = dom.window.document.querySelectorAll('.work > li')[randomWork].querySelector('.heading > a').href;
    });

    await JSDOM.fromURL(`${randomWorkUrl}${makeQueryString({ 'view_full_work': 'true', 'view_adult': 'true' })}`).then(dom => {
        const fandom = dom.window.document.querySelector('dd.fandom.tags').textContent.trim();
        const title = dom.window.document.querySelector('.title.heading').textContent.trim();
        const downloadLink = dom.window.document.querySelector('.download > ul > li:nth-child(2) > a').href;
        const summary = dom.window.document.querySelector('.summary .userstuff') ? dom.window.document.querySelector('.summary .userstuff').textContent.trim() : '';

        const paragraphs = dom.window.document.querySelectorAll('#chapters .userstuff > p');

        let randomParagraph, randomParagraphText;
        let i = 0;
        const paragraphsCount = paragraphs.length - 1;

        do {
            randomParagraph = getRandomInt(0, paragraphsCount);
            randomParagraphText = paragraphs[randomParagraph].textContent.trim().substring(0, 2048);
            i++;
        } while (randomParagraphText === '' || i > 5)

        bot.sendMessage(
            chatId,
            `<b>Случайная работа</b>\n\n${title}\n\n${fandom}\n\n${downloadLink}\n\n${summary}`,
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
    })
});

bot.on('error', (error) => {
    console.log(error.code);
});

bot.on('polling_error', (error) => {
    console.log(error);
});