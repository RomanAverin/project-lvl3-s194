import axios from 'axios';
import fs from 'mz/fs';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import debug from 'debug';

const log = debug('page-loader:');

const selectorFocusResource = {
  link: 'href',
  script: 'src',
  img: 'src',
};

const makeNameFromURL = (link, extention = '') => {
  const { host, pathname } = url.parse(link);
  return `${host}${pathname !== '/' ? pathname : ''}`
    .replace(/[^a-zA-Z]/gi, '-')
    .concat(`${extention}`);
};

const checkLinksForLocal = (link) => {
  if (!link) {
    return false;
  }
  const { host } = url.parse(link);
  if (host) {
    return false;
  }
  return true;
};

const getResouceLinks = (response) => {
  const $ = cheerio.load(response.data);
  const links = [];
  Object.keys(selectorFocusResource).map((tag => $(tag)
    .each((i, elem) => links.push($(elem).attr(selectorFocusResource[tag])))));
  const filtredLinks = links.filter(link => checkLinksForLocal(link));
  log('success, getting links: %o', filtredLinks.length);
  return { links: filtredLinks, response };
};

const mkResourceDir = (pathResourseDir, response) => fs.mkdir(pathResourseDir)
  .then(() => {
    log('Directory create success: %s', pathResourseDir);
    return response;
  });

const makeFileNameFromURL = (link) => {
  const { pathname } = url.parse(link);
  const { dir, name, ext } = path.parse(pathname);
  return `${dir}/${name}`.replace(/^./gi, '').replace(/[^a-zA-Z]/gi, '-').concat(ext);
};

const downloadFiles = (links, savePath, urlObj, response) =>
  axios.all(links.map((localLink) => {
    const resourceURL = url.format({
      protocol: urlObj.protocol,
      host: urlObj.host,
      pathname: localLink,
    });
    const axiosParams = { method: 'get', url: resourceURL, responseType: 'stream' };
    return axios.all([makeFileNameFromURL(localLink), axios(axiosParams)])
      .then(axios.spread((fileName, res) => {
        log('%s GET %s', res.status, res.config.url);
        return res.data.pipe(fs.createWriteStream(path.resolve(savePath, fileName)));
      }));
  })).then(() => response);

const getNewResourceLink = (link, pathToResorce) => {
  if (checkLinksForLocal(link)) {
    return path.join(pathToResorce, makeFileNameFromURL(link));
  }
  return link;
};

const processHtml = (pathToSrcDir, html) => {
  const $ = cheerio.load(html);
  Object.keys(selectorFocusResource).forEach(tag => $(tag)
    .attr(selectorFocusResource[tag], (item, value) => {
      if (value === undefined) {
        return null;
      }
      if (value) {
        log('Replaced value of tag: %s on %s', value, getNewResourceLink(value, pathToSrcDir));
        return getNewResourceLink(value, pathToSrcDir);
      }
      return value;
    }));
  return $.html();
};

export { makeNameFromURL, makeFileNameFromURL, getNewResourceLink, checkLinksForLocal };

export default (link, pathToOutput = './') => {
  const pageSavePath = path.resolve(pathToOutput, makeNameFromURL(link, '.html'));
  const resourceSavePath = path.resolve(pathToOutput, makeNameFromURL(link, '_files'));
  const resourceDir = makeNameFromURL(link, '_files');
  const urlObj = url.parse(link);
  return axios.get(link)
    .then((response) => {
      log('%s GET %s', response.status, link);
      return response;
    })
    .then(response => mkResourceDir(resourceSavePath, response))
    .then(response => getResouceLinks(response))
    .then(({ links, response }) => downloadFiles(links, resourceSavePath, urlObj, response))
    .then(response => processHtml(resourceDir, response.data))
    .then((html) => {
      log('Saving page: %s', pageSavePath);
      return fs.writeFile(pageSavePath, html);
    })
    .catch(error => console.log(error));
};
