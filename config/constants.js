const fkTag = 'Fandom%20Kombat';
const winterFkTag = 'WTF%20%7C%20Winter%20Temporary%20Fandom%20Kombat';
const ao3Url = 'https://archiveofourown.org';

const fkTagYears = {
    w2020: 'WTF%20%7C%20Winter%20Temporary%20Fandom%20Kombat%202020',
    2020: 'Fandom%20Kombat%202020',
    w2021: 'WTF%20%7C%20Winter%20Temporary%20Fandom%20Kombat%202021',
    2021: 'Fandom%20Kombat%202021',
    w2022: 'WTF%20%7C%20Winter%20Temporary%20Fandom%20Kombat%202022',
    2022: 'Fandom%20Kombat%202022'
}

const fkTagCollections = {
    2022: 'FandomKombat2022',
    2021: 'FandomKombat2021',
    2020: 'FandomKombat2020',
    w2021: 'WTFKombat2021',
    w2022: 'WTFKombat2022'
}

const worksUrl = `${ao3Url}/tags/${fkTag}/works`;

const ratingTags = {
    not_rated: 'Not Rated',
    g: 'General Audiences',
    t: 'Teen And Up Audiences',
    m: 'Mature',
    e: 'Explicit'
};

const ratingColors = {
    g: 2067276, //dark green
    t: 15844367, //gold
    m: 3426654, //navy
    e: 15548997	 //red
}

const ratingIds = {
    not_rated: '9',
    g: '10',
    t: '11',
    m: '12',
    e: '13'
}

module.exports = { worksUrl, ao3Url, fkTag, winterFkTag, fkTagYears, fkTagCollections, ratingTags, ratingColors, ratingIds }