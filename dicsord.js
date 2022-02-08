const { Client, Intents, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
// const { REST } = require('@discordjs/rest');
// const { Routes } = require('discord-api-types/v9');
const { makeWorksUrl, searchWorkPage, getWorkData, getWorkImages, getRandomParagraph, makeWorkAnswer } = require('./functions/func');
const { ao3Url } = require('./constants');

const { DISCORD_TOKEN, DISCORD_GUILD_ID, DISCORD_CLIENT_ID } = process.env;

const commands = [
    new SlashCommandBuilder().setName('random').setDescription('Get random work'),
]
    .map(command => command.toJSON());

const discord = async () => {
    const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

    client.once('ready', () => {
        console.log('Ready!');
    });

    // const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

    // rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), { body: commands })
    //     .then(() => console.log('Successfully registered application commands.'))
    //     .catch(console.error);


    //даунгрейд до 12 версии из-за ограничений ноды на сервере
    client.on('message', async interaction => {
        console.log(interaction)
        if (!interaction.isCommand()) return;

        const { content  } = interaction;

        switch (content) {
            case 'random':
                await interaction.reply(`Начинаю искать по тегам ${global.additionalTag} и ${global.seasonTag}`);

                const queryAttrs = {
                    // 'work_search%5Bwords_to%5D': 100
                };

                if (global.additionalTag) {
                    queryAttrs['work_search%5Bother_tag_names%5D'] = global.additionalTag;
                }

                const worksUrl = makeWorksUrl(global.seasonTag);
                const { dom, randomWorkUrl } = await searchWorkPage(worksUrl, queryAttrs);

                await interaction.editReply(`Собираю данные работы`);
                const { fandom, title, downloadLink, summary } = await getWorkData(dom);

                await interaction.editReply(`Ищу случайный абзац`);
                const randomParagraphText = getRandomParagraph(dom);

                await interaction.editReply(`Ищу картинки`);
                const { media, otherLinks } = getWorkImages(dom);

                const images = [];
                media.map(el => {
                    el.map(img => {
                        images.push(img.media)
                    })
                })

                const response = [
                    `**Фандом** ${fandom}`,
                    `**Название** ${title}`,
                ];

                if (summary) {
                    response.push(`\n${summary}`);
                }

                response.push(`[Ссылка на скачивание](${ao3Url}${downloadLink})`);
                response.push(`[Ссылка на страницу работы](${ao3Url}${randomWorkUrl})`);

                if (randomParagraphText) {
                    response.push(`\n**Случайный абзац**\n${randomParagraphText}`)
                }

                if (images.length) {
                    response.push(`\nНашел картинки: ${images.join('\n')}`)
                }

                if (otherLinks.length) {
                    response.push(`\nНашел видео: ${otherLinks.join('\n')}`)
                }

                await interaction.editReply({ content: response.join('\n') });
                break;
            default:
        }
    });
    
    client.login(DISCORD_TOKEN);

}

module.exports = discord