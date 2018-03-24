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

const isUrlAbsolute = (link) => {
  if (!link) {
    return false;
  }
  const { host } = url.parse(link);
  if (host) {
    return false;
  }
  return true;
};

const getResouceLinks = (html) => {
  log('Getting resource links from HTML');
  const $ = cheerio.load(html);
  const links = [];
  Object.keys(selectorFocusResource).map((tag => $(tag)
    .each((i, elem) => links.push($(elem).attr(selectorFocusResource[tag])))));
  const filtredLinks = links.filter(link => isUrlAbsolute(link));
  log('Success getting links: %o', filtredLinks.length);
  return filtredLinks;
};

const mkResourceDir = (pathResourseDir) => {
  log('Start make directory for resource files');
  return fs.mkdir(pathResourseDir)
    .then(() => {
      log('Directory create success: %s', pathResourseDir);
    });
};

const makeFileNameFromURL = (link) => {
  const { pathname } = url.parse(link);
  const { dir, name, ext } = path.parse(pathname);
  return `${dir}/${name}`.replace(/^./gi, '').replace(/[^a-zA-Z]/gi, '-').concat(ext);
};

const downloadFiles = (links, savePath, urlObj, html) => {
  log('Starting downloads resource files');
  return Promise.all(links.map((localLink) => {
    const resourceURL = url.format({
      protocol: urlObj.protocol,
      host: urlObj.host,
      pathname: localLink,
    });
    const axiosParams = { method: 'get', url: resourceURL, responseType: 'stream' };
    const fileName = makeFileNameFromURL(localLink);
    return axios(axiosParams)
      .then((res) => {
        log('%s GET %s', res.status, res.config.url);
        return res.data.pipe(fs.createWriteStream(path.resolve(savePath, fileName)));
      })
      .then(() => log('Save success: %s', fileName));
  })).then(() => html);
};

const getNewResourceLink = (link, pathToResorce) => {
  if (isUrlAbsolute(link)) {
    return path.join(pathToResorce, makeFileNameFromURL(link));
  }
  return link;
};

const changeHtml = (pathToSrcDir, html) => {
  log('Starting processing HTML to change resource links');
  return new Promise((resolve) => {
    setTimeout(() => {
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
      resolve($.html());
    }, 0);
  });
};

export { makeNameFromURL, makeFileNameFromURL, getNewResourceLink, isUrlAbsolute };

export default (link, pathToOutput = './') => {
  const pageSavePath = path.resolve(pathToOutput, makeNameFromURL(link, '.html'));
  const resourceSavePath = path.resolve(pathToOutput, makeNameFromURL(link, '_files'));
  const resourceDir = makeNameFromURL(link, '_files');
  const urlObj = url.parse(link);
  return mkResourceDir(resourceSavePath)
    .then(() => {
      log('Download HTML');
      return axios.get(link);
    })
    .then((response) => {
      log('%s GET %s', response.status, link);
      return response.data;
    })
    .then((html) => {
      const changedHtml = changeHtml(resourceDir, html);
      const links = getResouceLinks(html);
      return downloadFiles(links, resourceSavePath, urlObj, changedHtml);
    })
    .then((html) => {
      log('Saving changed page: %s', pageSavePath);
      return fs.writeFile(pageSavePath, html);
    })
    .then(() => log('Saved success'))
    .catch(error => console.log(error));
};
