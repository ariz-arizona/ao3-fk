// const fetch = require('cross-fetch');
const fetch = require('@vercel/fetch')(require('cross-fetch'));

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

const loadPage = async (url) => {
    if (!url) {
        return false
    }
    // console.log(url);
    try {
        const res = await fetch(url);
        if (res.status >= 400) {
            throw new Error("Bad response from server");
        }

        return await res.text();
    } catch (err) {
        console.error(err);
    }
};

const array_chunks = (array, chunk_size) => Array(Math.ceil(array.length / chunk_size)).fill().map((_, index) => index * chunk_size).map(begin => array.slice(begin, begin + chunk_size));

module.exports = { getRandomInt, makeQueryString, getSearchParametres, loadPage, array_chunks }
