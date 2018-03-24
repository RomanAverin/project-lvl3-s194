import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import fs from 'mz/fs';
import os from 'os';
import nock from 'nock';
import path from 'path';
import download, { makeNameFromURL, makeFileNameFromURL, checkLinksForLocal } from '../src';

const host = 'http://www.example.com';
const loadedfileName = 'www-example-com-test.html';
const fixtures = '__tests__/__fixtures__';
const expectedData = fs.readFileSync(path.join(fixtures, 'expected.html'), 'utf-8');
const originalData = fs.readFileSync(path.join(fixtures, 'original.html'), 'utf-8');
let tmpDir;

// hacks
axios.defaults.adapter = httpAdapter;
nock.disableNetConnect();

describe('Testing tool functions', async () => {
  it('makeNamefromURL', (done) => {
    expect(makeNameFromURL('https://ya.ru', '.html')).toBe('ya-ru.html');
    done();
  });
  it('makeFileNameFromUrl', (done) => {
    expect(makeFileNameFromURL('https://ya.ru/css/screen.css')).toBe('css-screen.css');
    done();
  });
  it('checkLinksForLocal', (done) => {
    const tested = ['/media/screen.css', '', undefined, 'http://test.ru/file.png', '/media/script.js', '/media/image.jpg'];
    const expectedLinks = ['/media/screen.css', '/media/script.js', '/media/image.jpg'];
    expect(tested.filter(link => checkLinksForLocal(link)))
      .toEqual(expect.arrayContaining(expectedLinks));
    done();
  });
});
beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  nock(host)
    .get('/test')
    .reply(200, originalData)
    .get('/media/style.css')
    .replyWithFile(200, path.join(fixtures, 'style.css'))
    .get('/media/script._js')
    .replyWithFile(200, path.join(fixtures, 'script._js'))
    .get('/media/image.jpg')
    .replyWithFile(200, path.join(fixtures, 'image.jpg'));
});
describe('Testing page-loader', () => {
  it('load html to file', async () => {
    await download(`${host}/test`, tmpDir);
    const loadedData = await fs.readFile(path.join(tmpDir, loadedfileName), 'utf-8');
    expect(loadedData).toBe(expectedData);
  });
});

