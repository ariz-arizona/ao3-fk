const fkTag = 'Fandom%20Kombat';
const winterFkTag = 'WTF%20%7C%20Winter%20Temporary%20Fandom%20Kombat';
const ao3Url = 'https://archiveofourown.org';

const fkTagYears = {
    w2020: 'WTF%20%7C%20Winter%20Temporary%20Fandom%20Kombat%202022',
    2020: 'Fandom%20Kombat%202020',
    w2021: 'WTF%20%7C%20Winter%20Temporary%20Fandom%20Kombat%202021',
    2021: 'Fandom%20Kombat%202021',
    w2022: 'WTF%20%7C%20Winter%20Temporary%20Fandom%20Kombat%202022'
}

const fkTagCollections = {
    2021: 'FandomKombat2021',
    2020: 'FandomKombat2020',
}

const worksUrl = `${ao3Url}/tags/${fkTag}/works`;

module.exports = { worksUrl, ao3Url, fkTag, winterFkTag, fkTagYears }