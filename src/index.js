import axios from 'axios';
import fs from 'mz/fs';
import url from 'url';
import path from 'path';

const makeNamefromURL = (link) => {
  const { host, pathname } = url.parse(link);
  return `${host}${pathname !== '/' ? pathname : ''}`
    .replace(/[^a-zA-Z]/g, '-')
    .concat('.html');
};

export { makeNamefromURL };
export default (link, pathToOutput = './') => {
  const savePath = path.resolve(pathToOutput, makeNamefromURL(link));
  return axios.get(link)
    .then(response => fs.writeFile(savePath, response.data))
    .catch(error => console.log(error));
};
