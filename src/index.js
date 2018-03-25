import axios from 'axios';
import fs from 'mz/fs';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import debug from 'debug';
import Listr from 'listr';

const log = debug('page-loader:');

const errorHandler = (error) => {
  const { message } = error;
  return `ERROR: ${message}`;
};

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

const isUrlAbsolute = (link, hostname) => {
  if (!link) {
    return false;
  }
  const { host: pageHost } = url.parse(link);
  if (pageHost === hostname) {
    return true;
  }
  return false;
};

const getResouceLinks = (html, hostname) => {
  log('Getting resource links from HTML for host:', hostname);
  const $ = cheerio.load(html);
  const links = [];
  Object.keys(selectorFocusResource).map((tag => $(tag)
    .each((i, elem) => links.push($(elem).attr(selectorFocusResource[tag])))));
  const filtredLinks = links.filter(link => isUrlAbsolute(link, hostname));
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
  if (path.isAbsolute(pathname)) {
    return path.normalize(pathname).slice(1).split('/').join('-');
  }
  return path.normalize(pathname).split('/').join('-');
};

const downloadFiles = (links, savePath) => {
  log('Starting downloads resource files');
  const dowloadTasks = new Listr(links.map(link =>
    ({
      title: `Download: ${link}`,
      task: () => {
        const axiosParams = { method: 'get', url: link, responseType: 'stream' };
        const fileName = makeFileNameFromURL(link);
        return axios(axiosParams)
          .then((res) => {
            log('%s GET %s', res.status, res.config.url);
            return res.data.pipe(fs.createWriteStream(path.resolve(savePath, fileName)));
          })
          .then(() => log('Save success: %s', fileName));
      },
    })));
  return dowloadTasks.run();
};

const getNewResourceLink = (link, pathToResorce, hostname) => {
  if (isUrlAbsolute(link, hostname)) {
    return path.join(pathToResorce, makeFileNameFromURL(link));
  }
  return link;
};

const changeHtml = (pathToSrcDir, html, hostname) => {
  log('Starting processing HTML to change resource links');
  const $ = cheerio.load(html);
  Object.keys(selectorFocusResource).forEach(tag => $(tag)
    .attr(selectorFocusResource[tag], (item, value) => {
      if (value === undefined) {
        return null;
      }
      if (value) {
        log('Replaced value of tag: %s on %s', value, getNewResourceLink(value, pathToSrcDir, hostname));
        return getNewResourceLink(value, pathToSrcDir, hostname);
      }
      return value;
    }));
  return $.html();
};

export { makeNameFromURL, makeFileNameFromURL, getNewResourceLink, isUrlAbsolute, errorHandler };

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
      const links = getResouceLinks(html, urlObj.hostname);
      const changedHtml = changeHtml(resourceDir, html, urlObj.hostname);
      return downloadFiles(links, resourceSavePath)
        .then(() => changedHtml);
    })
    .then((changedHtml) => {
      const data = changedHtml;
      log('Saving changed page: %s', pageSavePath);
      return fs.writeFile(pageSavePath, data);
    })
    .then(() => log('Saved success'))
    .catch((error) => {
      const errorMessage = errorHandler(error);
      log('Download completed with error %O', errorMessage);
      return Promise.reject(error);
    });
};
