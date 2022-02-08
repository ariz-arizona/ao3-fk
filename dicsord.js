const { Client, Intents } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
// const { REST } = require('@discordjs/rest');
// const { Routes } = require('discord-api-types/v9');
// const slash = require('discord-slash-commands-v12');

const { makeWorksUrl, searchWorkPage, getWorkData, getWorkImages, getRandomParagraph, makeWorkAnswer } = require('./functions/func');
const { ao3Url } = require('./constants');

const { DISCORD_TOKEN } = process.env;
const prefix = '!';

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const discord = async () => {
    client.on('ready', () => {
        console.log('Ready!');
    });

    // даунгрейд до 12 версии
    client.on('message', async (msg) => {
        // console.log(msg)
        if (msg.author.bot) return;
        // if (!msg.guild) return;
        if (!msg.content.startsWith(prefix)) return;

        const args = msg.content.slice(prefix.length).trim().split(/ +/g);
        const cmd = args.shift().toLowerCase();

        if (cmd.length === 0) return;

        switch (cmd) {
            case 'random':
                const techMsg = await msg.reply(`Начинаю искать по тегам ${global.additionalTag} и ${global.seasonTag}`);

                const queryAttrs = {
                    // 'work_search%5Bwords_to%5D': 100
                };

                if (global.additionalTag) {
                    queryAttrs['work_search%5Bother_tag_names%5D'] = global.additionalTag;
                }

                const worksUrl = makeWorksUrl(global.seasonTag);
                const { dom, randomWorkUrl } = await searchWorkPage(worksUrl, queryAttrs);

                await techMsg.edit(`Собираю данные работы`);
                const { fandom, title, downloadLink, summary } = await getWorkData(dom);

                await techMsg.edit(`Ищу случайный абзац`);
                const randomParagraphText = getRandomParagraph(dom).slice(0, 900);

                await techMsg.edit(`Ищу картинки`);
                const { media, otherLinks } = getWorkImages(dom);

                const images = [];
                media.map(el => {
                    el.map(img => {
                        images.push(img.media)
                    })
                })

                const response = []
                if (images.length) {
                    response.push(`\nНашел картинки: ${images.join('\n')}`)
                }

                if (otherLinks.length) {
                    response.push(`\nНашел видео: ${otherLinks.join('\n')}`)
                }

                await techMsg.edit(`Все нашел!`)

                const embed = {
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

                await techMsg.edit({ embed });
                break;
            default:
        }
    });

    client.login(DISCORD_TOKEN);
}

module.exports = discord