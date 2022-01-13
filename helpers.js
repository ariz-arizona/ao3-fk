const fetch = require('cross-fetch');

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

const closeWindow = (dom) => {
    dom.window.close()
    if (typeof global.gc === 'function') {
        global.gc()
    }
}

const loadPage = async (url) => {
    // console.log(url)
    if (!url) {
        return false
    }
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

module.exports = { getRandomInt, makeQueryString, getSearchParametres, closeWindow, loadPage }