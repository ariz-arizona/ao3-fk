const { fkTag, winterFkTag, ao3Url } = require("../config/constants")
const { searchWorkPage, makeWorksUrl, getWorkAllData } = require("../functions/func")

test('makeWorksUrl, формирование урл работ', () => {
    const fkUrl = makeWorksUrl(fkTag);
    const winterFkUrl = makeWorksUrl(winterFkTag);

    expect(fkUrl).toBe(`${ao3Url}/tags/${fkTag}/works`);
    expect(winterFkUrl).toBe(`${ao3Url}/tags/${winterFkTag}/works`);
});

test('searchWorkPage, выбор случайной работы по параметрам', async () => {
    const { randomWorkUrl, dom } = await searchWorkPage(makeWorksUrl(fkTag), {});

    expect(randomWorkUrl).toEqual(expect.stringMatching(/works\/\d*/));
    expect(dom.constructor.name).toBe('HTMLElement');
});

test('getAllWorkData, получение данных о работе', async () => {
    const { dom } = await searchWorkPage(makeWorksUrl(fkTag), {});

    const { title, fandom, randomParagraphText, summary, images, otherLinks, author, tags, rating } = await getWorkAllData(dom);
//todo отдельно проверка картинок
    expect(title).toBeDefined();
    expect(fandom).toBeDefined();
    expect(randomParagraphText).toBeDefined();
    expect(summary).toBeDefined();
    expect(typeof images).toBe('object');
    expect(typeof otherLinks).toBe('object');
    expect(author).toBeDefined();
    expect(tags).toBeDefined();
    expect(rating).toBeDefined();
})