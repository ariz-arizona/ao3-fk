require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');

const { getRandomInt } = require('./helpers');
const { searchWorkPage, getWorkData, makeWorkAnswer } = require('./func');

const { BOT_TOKEN } = process.env;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

//todo продолжать работу при ошибке парсинга
//todo ссылка на скачивание вместо урл страницы ??

bot.onText(/\/cit/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`Сделан запрос cit от чат айди ${chatId}`);

    try {
        const queryAttrs = {
            'work_search%5Bwords_from%5D': 100
        };

        const techMsg = await bot.sendMessage(chatId, 'Открываю все работы')
        const techMsgId = techMsg.message_id;

        const { dom, randomWorkUrl } = await searchWorkPage(bot, chatId, techMsgId, queryAttrs);
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
        console.log(`Для чат айди ${chatId} загружена работа ${randomWorkUrl}`);

        const text = makeWorkAnswer(title, fandom, downloadLink, summary, randomWorkUrl);

        bot.sendMessage(chatId, text.join('\n\n'), { parse_mode: 'HTML' })
            .then(() => {
                return bot.sendMessage(
                    chatId,
                    `<b>Случайный параграф</b>\n${randomParagraphText}`,
                    { parse_mode: 'HTML' }
                );
            });

        if (process.memoryUsage().heapUsed > 200000000) {
            global.gc();
        }

    } catch (error) {
        bot.sendMessage(chatId, 'Ой! Что-то случилось! Может, попробуете еще раз?');
        console.log(`Ошибка в чате ${chatId}\n${error}`);
    }
});

bot.onText(/\/pic/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`Сделан запрос pic от чат айди ${chatId}`);

    try {
        const queryAttrs = {
            'work_search%5Bwords_to%5D': 100
        };

        const techMsg = await bot.sendMessage(chatId, 'Открываю все работы')
        const techMsgId = techMsg.message_id;

        const { dom, randomWorkUrl } = await searchWorkPage(bot, chatId, techMsgId, queryAttrs);
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

        const text = makeWorkAnswer(title, fandom, downloadLink, summary, randomWorkUrl);

        bot.editMessageText('Все нашел!', { chat_id: chatId, message_id: techMsgId });
        console.log(`Для чат айди ${chatId} загружена работа ${randomWorkUrl}`);

        bot.sendMessage(chatId, text.join('\n\n'), { parse_mode: 'HTML' })
            .then(() => {
                if (otherLinks.length) {
                    otherLinks.forEach(link => {
                        return bot.sendMessage(chatId, `Я нашел видео, посмотрите его по ссылке:\n${link}`);
                    })
                }
                return bot.sendMediaGroup(chatId, images);
            });

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