const { Client, Intents } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
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

    client.login(DISCORD_TOKEN);

    const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

    rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), { body: commands })
        .then(() => console.log('Successfully registered application commands.'))
        .catch(console.error);

    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;

        const { commandName } = interaction;

        switch (commandName) {
            case 'random':
                await interaction.reply('Working on it');

                const queryAttrs = {

                };
                if (global.additionalTag) {
                    queryAttrs['work_search%5Bother_tag_names%5D'] = global.additionalTag;
                }

                const worksUrl = makeWorksUrl(global.seasonTag);
                const { dom, randomWorkUrl } = await searchWorkPage(worksUrl, queryAttrs);
                const { fandom, title, downloadLink, summary } = await getWorkData(dom);
                const randomParagraphText = getRandomParagraph(dom);
                const { media, otherLinks } = getWorkImages(dom);

                const images = [];
                media.map(el => {
                    el.map(img => {
                        if (img && img.length) {
                            img.forEach(element => {
                                images.push(element.media)
                            })
                        }
                    })
                })

                const response = [
                    `**Фандом** ${fandom}`,
                    `**${title}**`,
                    summary,
                    `**Ссылка на скачивание** ${ao3Url}${downloadLink}`,
                    `**Ссылка на страницу работы** ${ao3Url}${randomWorkUrl}`,
                    '',
                    randomParagraphText,
                    images.join('\n')
                ]

                await interaction.editReply(response.join('\n'));

                break;
            default:
        }
    });
}

module.exports = discord