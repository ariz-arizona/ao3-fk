const router = require("express").Router();

const fetch = require("@vercel/fetch")(require("cross-fetch"));
const {
  InteractionType,
  InteractionResponseType,
  verifyKey,
  InteractionResponseFlags,
} = require("discord-interactions");
const HTMLParser = require("node-html-parser");

const {
  ao3Url,
  fkTagCollections,
  fkTagYears,
  winterFkTag,
  fkTag,
} = require("../config/constants");
const {
  collectionFinderFunc,
  workParserFinder,
  makeEmbed,
} = require("../functions/main");
const {
  getWorkData,
  getRandomParagraph,
  getWorkImages,
  discordWebhookResponse,
  makeWorksUrl,
  searchWorkPage,
  getWorkAllData,
  getResume,
  errorMessage,
} = require("../functions/func");
const { makeQueryString, loadPage } = require("../functions/helpers");
const { response } = require("express");

const { DISCORD_APPLICATION_ID } = process.env;

const defKombat = {
  season: fkTag,
  additional: fkTagYears["w2023"],
  collection: fkTagCollections["w2023"],
};

const randomWorkFinder = async (token, queryAttrs, userId) => {
  await discordWebhookResponse("PATCH", token, {
    content: `Начинаю искать случайную работу по тегам ${[
      global.additionalTag,
      global.seasonTag,
    ].join(", ")}`,
  });
  const { dom, randomWorkUrl } = await searchWorkPage(
    makeWorksUrl(global.seasonTag),
    queryAttrs
  );

  await discordWebhookResponse("PATCH", token, {
    content: `Нашел работу ${randomWorkUrl}`,
  });

  const {
    title,
    fandom,
    randomParagraphText,
    resume,
    summary,
    images,
    otherLinks,
    author,
    tags,
    rating,
  } = await getWorkAllData(dom);

  const embed = makeEmbed(
    title,
    fandom,
    randomWorkUrl,
    randomParagraphText,
    resume,
    summary,
    images,
    otherLinks,
    author,
    tags,
    rating
  );

  await discordWebhookResponse("POST", token, {
    content: userId ? `<@${userId}> спрашивал, и я нашел ответ:` : "",
    embeds: [embed],
  });
};

router.post("/nude_random/:messageId/:timestamp", async (_req, res) => {
  // todo вывод ошибки
  if (!_req.body.application_id) {
    throw new Error("no application_id");
  }

  const message = _req.body;
  const { token } = message;
  const userId = message.guild_id ? message.member.user.id : message.user.id;

  try {
    const queryAttrs = {};

    if (global.additionalTag) {
      queryAttrs["work_search%5Bother_tag_names%5D"] = global.additionalTag;
    }

    await randomWorkFinder(token, queryAttrs, userId);
  } catch (error) {
    console.log(error);
    const msg = errorMessage(error);
    await discordWebhookResponse("POST", token, {
      content: `Ошибка: ${msg}`,
    });
  }

  res.sendStatus(200);
});

router.post("/random/:messageId/:timestamp", async (_req, res) => {
  if (!_req.body.application_id) {
    throw new Error("no application_id");
  }

  const message = _req.body;
  const { token } = message;
  const userId = message.guild_id ? message.member.user.id : message.user.id;

  try {
    const options = {};
    (message.data.options || []).forEach((element) => {
      options[element.name] = element.value;
    });

    const queryAttrs = {};
    if (options.comments_count) {
      if (options.comments_count === "few") {
        queryAttrs["work_search%5Bcomments_count%5D"] =
          encodeURIComponent("<3");
      } else if (options.comments_count === "zero") {
        queryAttrs["work_search%5Bcomments_count%5D"] =
          encodeURIComponent("<1");
      }
    }

    if (options.kudos_count) {
      if (options.kudos_count === "few") {
        queryAttrs["work_search%5Bkudos_count%5D"] = encodeURIComponent("<10");
      } else if (options.kudos_count === "zero") {
        queryAttrs["work_search%5Bkudos_count%5D"] = encodeURIComponent("<1");
      }
    }

    if (options.word_count) {
      if (options.word_count === "art") {
        queryAttrs["work_search%5Bword_count%5D"] = encodeURIComponent("<100");
      } else if (options.word_count === "mibl") {
        queryAttrs["work_search%5Bword_count%5D"] =
          encodeURIComponent("101-4000");
      } else if (options.word_count === "midi") {
        queryAttrs["work_search%5Bword_count%5D"] =
          encodeURIComponent("4001-15000");
      } else if (options.word_count === "maxi") {
        queryAttrs["work_search%5Bword_count%5D"] =
          encodeURIComponent(">15001");
      }
    }

    if (options.rating) {
      queryAttrs["work_search%5Brating_ids%5D"] = options.rating;
    }

    if (options.query) {
      queryAttrs["work_search%5Bquery%5D"] = encodeURIComponent(options.query);
    }

    if (options.season) {
      global.additionalTag = fkTagYears[options.season];

      if (options.season.indexOf("w") === 0) {
        global.seasonTag = winterFkTag;
      } else {
        global.seasonTag = fkTag;
      }
    } else {
      global.seasonTag = defKombat.season;
      global.additionalTag = defKombat.additional;
    }

    if (global.additionalTag) {
      queryAttrs["work_search%5Bother_tag_names%5D"] = global.additionalTag;
    }
    // console.log({ options, global });
    await randomWorkFinder(token, queryAttrs, userId);
  } catch (error) {
    console.log(error);
    const msg = errorMessage(error);
    await discordWebhookResponse("POST", token, {
      content: `Ошибка: ${msg}`,
    });
  }

  res.sendStatus(200);
});

const collectionToken = {};

router.post("/collection/:messageId/:timestamp", async (_req, res) => {
  try {
    if (!_req.body.application_id) {
      return;
    }
    const message = _req.body;
    const { messageId } = _req.params;
    const { token } = message;

    collectionToken[messageId] = token;

    // console.log({ type: "api_collection", id: message.id, token })

    const collections = await collectionFinderFunc(defKombat.collection);
    await fetch(
      `https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}/messages/@original`,
      {
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
        body: JSON.stringify({
          content: `Начинаю искать коллекцию в ${defKombat.collection}`,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: "collection_select",
                  options: collections.map((el) => {
                    return {
                      label: el.name,
                      value: el.href,
                      token,
                    };
                  }),
                  placeholder: "Choose collection",
                  min_values: 1,
                  max_values: 1,
                },
              ],
            },
          ],
        }),
      }
    );
  } catch (error) {
    console.log(error);
    const msg = errorMessage(error);
    await discordWebhookResponse("POST", token, {
      content: `Ошибка: ${msg}`,
    });
  }

  res.sendStatus(200);
});

router.post("/collection_select/:messageId", async (_req, res) => {
  try {
    const message = _req.body;
    const { messageId } = _req.params;
    const token = collectionToken[messageId] || message.token;
    delete collectionToken[messageId];

    const userId = message.guild_id ? message.member.user.id : message.user.id;

    const url = `${ao3Url}${message.data.values[0]}`;
    const { dom, href } = await workParserFinder(url);
    const { fandom, title, summary, author, tags, rating } = await getWorkData(
      dom
    );

    const randomParagraphText = getRandomParagraph(dom).slice(0, 900);
    const resume = getResume(dom);
    const { media, otherLinks } = getWorkImages(dom);
    const images = [];
    media.map((el) => {
      el.map((img) => {
        images.push(img.media);
      });
    });

    const embed = makeEmbed(
      title,
      fandom,
      href,
      randomParagraphText,
      resume,
      summary,
      images,
      otherLinks,
      author,
      tags,
      rating
    );

    await fetch(
      `https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}/messages/@original`,
      {
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
        body: JSON.stringify({
          content: `Нашел работу ${href}`,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: "collection_select",
                  options: [
                    {
                      default: true,
                      label: message.data.values[0],
                      value: message.data.values[0],
                    },
                  ],
                  placeholder: "Choose collection",
                  disabled: true,
                },
              ],
            },
          ],
        }),
      }
    );

    await fetch(
      `https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}`,
      {
        headers: { "Content-Type": "application/json" },
        method: "post",
        body: JSON.stringify({
          content: userId ? `<@${userId}> спрашивал, и я нашел ответ:` : "",
          embeds: [embed],
        }),
      }
    );
  } catch (error) {
    console.log(error);
    const msg = errorMessage(error);
    await discordWebhookResponse("POST", token, {
      content: `Ошибка: ${msg}`,
    });
  }

  res.sendStatus(200);
});

router.post("/card_modal/:messageId", async (_req, res) => {
  const message = _req.body;
  // const { messageId } = _req.params;
  const { token } = message;

  // console.log({ type: "api_card_modal", id: message.id, token })

  const components = message.data.components.map((el) => el.components[0]);
  const workId = components.find((el) => el.custom_id === "work_id")
    ? components.find((el) => el.custom_id === "work_id").value
    : null;
  const review = components.find((el) => el.custom_id === "review")
    ? components.find((el) => el.custom_id === "review").value
    : null;

  const url = `${ao3Url}/works/${workId}`;
  try {
    const queryAttrs = {
      view_full_work: "true",
      view_adult: "true",
    };
    const content = await loadPage(`${url}${makeQueryString(queryAttrs)}`);
    const dom = HTMLParser.parse(content);
    const { fandom, title, summary, author, tags, rating } = await getWorkData(
      dom
    );

    const randomParagraphText = getRandomParagraph(dom).slice(0, 900);
    const resume = getResume(dom);
    const { media, otherLinks } = getWorkImages(dom);
    const images = [];
    media.map((el) => {
      el.map((img) => {
        images.push(img.media);
      });
    });

    const embed = makeEmbed(
      title,
      fandom,
      `/works/${workId}`,
      randomParagraphText,
      resume,
      summary,
      images,
      otherLinks,
      author,
      tags,
      rating
    );

    await fetch(
      `https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}`,
      {
        headers: { "Content-Type": "application/json" },
        method: "post",
        body: JSON.stringify({
          content: review || "",
          embeds: [embed],
        }),
      }
    );
  } catch (error) {
    console.log(error);
    await fetch(
      `https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}`,
      {
        headers: { "Content-Type": "application/json" },
        method: "post",
        body: JSON.stringify({
          content: `Я ничего не нашел :(`,
        }),
      }
    );
  }

  // console.log(message)

  res.sendStatus(200);
});

router.post("/discord", async (_req, res) => {
  const signature = _req.headers["x-signature-ed25519"];
  const timestamp = _req.headers["x-signature-timestamp"];
  const isValidRequest = verifyKey(
    _req.rawBody,
    signature,
    timestamp,
    process.env.DISCORD_PUB_KEY
  );
  // console.log({isValidRequest, timestamp})
  if (!isValidRequest) {
    return res.status(401).send({ error: "Bad request signature " });
  }

  const message = _req.body;
  // console.log({headers:_req.headers, body: _req.body})

  if (message.type === InteractionType.PING) {
    res.status(200).send({
      type: InteractionResponseType.PONG,
    });
  } else if (
    message.type === InteractionType.APPLICATION_COMMAND ||
    message.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE ||
    message.type === InteractionType.MESSAGE_COMPONENT ||
    5 // MODAL
  ) {
    try {
      const command = message.data.name || message.data.custom_id;
      switch (command) {
        case "nude_random":
          fetch(
            `http${
              _req.headers.host.indexOf("localhost") !== -1 ? "" : "s"
            }://${_req.headers.host}/nude_random/${message.id}/${timestamp}`,
            {
              method: "post",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(message),
            }
          );

          await new Promise((resolve) => setTimeout(resolve, 200));

          res.status(200).send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: `Начинаю искать работу`,
            },
          });
          break;
        case "random":
          fetch(
            `http${
              _req.headers.host.indexOf("localhost") !== -1 ? "" : "s"
            }://${_req.headers.host}/random/${message.id}/${timestamp}`,
            {
              method: "post",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(message),
            }
          );

          await new Promise((resolve) => setTimeout(resolve, 200));

          res.status(200).send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: `Начинаю искать работу`,
            },
          });
          break;
        case "collection":
          fetch(
            `http${
              _req.headers.host.indexOf("localhost") !== -1 ? "" : "s"
            }://${_req.headers.host}/collection/${message.id}/${timestamp}`,
            {
              method: "post",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(message),
            }
          );

          await new Promise((resolve) => setTimeout(resolve, 200));

          res.status(200).send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: `Начинаю искать коллекцию`,
            },
          });
          break;
        case "collection_select":
          fetch(
            `http${
              _req.headers.host.indexOf("localhost") !== -1 ? "" : "s"
            }://${_req.headers.host}/collection_select/${
              message.message.interaction.id
            }`,
            {
              method: "post",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(message),
            }
          );

          await new Promise((resolve) => setTimeout(resolve, 200));

          res.status(200).send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: `Начинаю искать работу`,
            },
          });
          break;
        case "card":
          res.status(200).send({
            type: 9,
            data: {
              title: "My Card Modal",
              custom_id: "card_modal",
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 4,
                      custom_id: "work_id",
                      label: "Work ID",
                      style: 1,
                      min_length: 1,
                      max_length: 400,
                      required: true,
                    },
                  ],
                },
                {
                  type: 1,
                  components: [
                    {
                      type: 4,
                      custom_id: "review",
                      label: "Review",
                      style: 2,
                      min_length: 1,
                      max_length: 2000,
                      required: false,
                    },
                  ],
                },
              ],
            },
          });
          break;

        case "card_modal":
          fetch(
            `http${
              _req.headers.host.indexOf("localhost") !== -1 ? "" : "s"
            }://${_req.headers.host}/card_modal/${message.id}`,
            {
              method: "post",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(message),
            }
          );

          await new Promise((resolve) => setTimeout(resolve, 200));

          res.status(200).send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: `Начинаю искать работу`,
            },
          });
          break;

        default:
          res.status(200).send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: `Я этого не умею :(`,
            },
          });
      }
    } catch (error) {
      await fetch(
        `https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${message.token}`,
        {
          headers: { "Content-Type": "application/json" },
          method: "post",
          body: JSON.stringify({
            content: "Ой! Что-то случилось!",
          }),
        }
      );
      console.log(error);
      res.sendStatus(500);
    }
  } else {
    res.status(400).send({ error: "Unknown Type" });
  }
});

module.exports = router;
