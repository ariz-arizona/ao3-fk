const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
}

const makeQueryString = (queryAttrs) => {
    let queryString = '?';
    for (const [key, value] of Object.entries(queryAttrs)) {
        queryString += `${key}=${value}&`;
    }
    return queryString;
}

const getSearchParametres = (url) => {
    const res = {};
    url.split('?').slice(1)[0].split('&').map(el => {
        const parse = el.split('=');
        res[parse[0]] = parse[1]
    });
    return res;
}

module.exports = { getRandomInt, makeQueryString, getSearchParametres }