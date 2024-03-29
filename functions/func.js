const HTMLParser = require("node-html-parser");
const fetch = require("@vercel/fetch")(require("cross-fetch"));

const { ao3Url, ratingTags } = require("../config/constants");
const {
  getRandomInt,
  makeQueryString,
  getSearchParametres,
  loadPage,
  array_chunks,
} = require("./helpers");

const { DISCORD_APPLICATION_ID } = process.env;

//todo глобальные переменные?
const searchWorkPage = async (worksUrl, queryAttrs) => {
  // const bot = global.bot;
  const chatId = global.chatId;

  // console.log(`${worksUrl}${makeQueryString(queryAttrs)}`)
  let pageQuery = {};
  let content;
  let dom;

  content = await loadPage(`${worksUrl}${makeQueryString(queryAttrs)}`);
  dom = HTMLParser.parse(content);

  if (dom.querySelectorAll(".work > li").length === 0) {
    throw new Error("notfound");
  }

  let lastPageUrl;
  if (dom.querySelector(".pagination li:nth-last-child(2) a")) {
    lastPageUrl = dom
      .querySelector(".pagination li:nth-last-child(2) a")
      .getAttribute("href");
  }
  const searchParams = dom.querySelector(".pagination li:nth-last-child(2) a")
    ? getSearchParametres(lastPageUrl)
    : queryAttrs;
  const randomPage = getRandomInt(1, searchParams.page);

  pageQuery = searchParams;
  pageQuery.page = randomPage;

  techMsg("Выбрал случайную страницу");

  const randomPageUrl = `${worksUrl}${makeQueryString(pageQuery)}`;

  content = await loadPage(`${randomPageUrl}`);
  dom = HTMLParser.parse(content);

  const worksCount = dom.querySelectorAll(".work > li").length - 1;
  const randomWork = getRandomInt(0, worksCount);
  const randomWorkUrl = dom
    .querySelectorAll(".work > li")
    [randomWork].querySelector(".heading > a")
    .getAttribute("href");

  techMsg(`Выбрал случайную работу ${randomWorkUrl}`);
  console.log(`Для чат айди ${chatId} выбрана работа ${randomWorkUrl}`);

  content = await loadPage(
    `${ao3Url}${randomWorkUrl}${makeQueryString({
      view_full_work: "true",
      view_adult: "true",
    })}`
  );
  dom = HTMLParser.parse(content);

  return { dom, randomWorkUrl };
};

const getWorkData = async (dom) => {
  const fandom = dom.querySelector("dd.fandom.tags")
    ? dom.querySelector("dd.fandom.tags").textContent.trim()
    : "Фандом не найден";
  const title = dom.querySelector(".title.heading")
    ? dom.querySelector(".title.heading").textContent.trim()
    : "Заголовок не найден";
  const downloadLink = dom.querySelector(".download > ul > li:nth-child(2) > a")
    ? dom
        .querySelector(".download > ul > li:nth-child(2) > a")
        .getAttribute("href")
    : null;
  const summary = dom.querySelector(".summary .userstuff")
    ? dom.querySelector(".summary .userstuff").textContent.trim()
    : "";

  const ratingRaw = dom.querySelector("dd.rating.tags").textContent.trim();
  const rating = Object.keys(ratingTags).find(
    (key) => ratingTags[key] === ratingRaw
  );

  const author = [];
  dom.querySelectorAll('a[rel="author"]').forEach((el) => {
    if (el.textContent) author.push(el.textContent);
  });

  const tags = [];
  dom.querySelectorAll("a.tag").forEach((el) => {
    if (el.textContent) tags.push(el.textContent);
  });

  return { fandom, title, downloadLink, summary, author, tags, rating };
};

const makeWorkAnswer = (
  title,
  fandom,
  downloadLink,
  summary,
  randomWorkUrl
) => {
  const text = [
    "<b>Случайная работа</b>",
    `<b>Название</b>: ${title}`,
    `<b>Фандом</b>: ${fandom}`,
  ];
  summary ? text.push(`<b>Саммари</b>: ${summary}`) : null;

  return text;
};

const getWorkImages = (dom) => {
  //если картинка очень большая - не грузить, давать ссылку
  const mediaElements = dom.querySelectorAll(
    "#chapters .userstuff img, #chapters .userstuff iframe"
  );
  const images = [];
  const otherLinks = [];

  if (mediaElements.length > 0) {
    mediaElements.forEach((item) => {
      if (item.tagName === "IMG") {
        images.push({
          type: "photo",
          media: item.getAttribute("src"),
        });
      } else {
        otherLinks.push(item.getAttribute("src"));
      }
    });
  }

  const media = array_chunks(images, 10);
  return { media, otherLinks };
};

const getRandomParagraph = (dom) => {
  const paragraphs = dom.querySelectorAll("#chapters .userstuff p");

  let randomParagraph, randomParagraphText;
  let i = 0;

  do {
    randomParagraph = getRandomInt(0, paragraphs.length - 1);
    randomParagraphText = paragraphs[randomParagraph]
      ? paragraphs[randomParagraph].textContent.trim().substring(0, 2048)
      : "";

    if (randomParagraphText === "") {
      paragraphs.splice(randomParagraph, 1);
    }

    techMsg(`Ищу случайный абзац ${i + 1} раз`);
    i++;
  } while (randomParagraphText === "" && i < 5);

  return randomParagraphText;
};

const getResume = (dom) => {
  const words = dom
    .querySelector("#chapters .userstuff")
    .textContent.trim()
    .split(" ")
    .filter((el) => el.length > 1);

  const int = words.length > 1000 ? Math.floor(words.length / 100) : 10;
  const result = [];

  for (i = 0; i < words.length; i = i + int) {
    result.push(words[i]);
  }

  techMsg(`Делаю резюме (каждое ${int} слово)`);

  return result.join(" ");
};

const getWorkAllData = async (dom) => {
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

  return {
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
  };
};

const errorMessage = (error) => {
  let msg;
  switch (error.message) {
    case "notfound":
      msg = "Я ничего не нашел :(";
      break;
    default:
      msg = "Ой! Что-то случилось! Может, попробуете еще раз?";
  }
  return msg;
};

const showError = (error) => {
  const bot = global.bot;
  const chatId = global.chatId;

  const msg = errorMessage(error);
  bot.sendMessage(chatId, msg);
  console.log(`Ошибка в чате ${chatId}\n${error.code}`);
};

const makeWorksUrl = (seasonTag) => {
  return `${ao3Url}/tags/${seasonTag}/works`;
};

const techMsg = async (msg, isNew = false) => {
  const bot = global.bot;
  const chatId = global.chatId;
  const techMsgId = global.techMsgId;

  if (!bot || !chatId) {
    return false;
  }

  if (!techMsgId) {
    isNew = true;
  }

  if (isNew) {
    const techMsg = await bot.sendMessage(chatId, "Открываю все работы");
    const techMsgId = techMsg.message_id;
    global.techMsgId = techMsgId;
  } else {
    bot.editMessageText(msg, { chat_id: chatId, message_id: techMsgId });
  }
};

const discordWebhookResponse = async (method = "POST", token, body) => {
  const url = `https://discord.com/api/v8/webhooks/${DISCORD_APPLICATION_ID}/${token}`;
  // todo try catch
  // console.log({method, body})
  const response = await fetch(
    `${url}${method === "PATCH" ? "/messages/@original" : ""}`,
    {
      headers: { "Content-Type": "application/json" },
      method: method,
      body: JSON.stringify(body),
    }
  );

  if (response.status >= 400) {
    console.log(JSON.stringify(response));
  }

  return true;
};

module.exports = {
  searchWorkPage,
  getWorkData,
  makeWorkAnswer,
  getWorkImages,
  getRandomParagraph,
  getResume,
  getWorkAllData,
  errorMessage,
  showError,
  makeWorksUrl,
  techMsg,
  discordWebhookResponse,
};
