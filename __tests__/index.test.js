import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import fs from 'mz/fs';
import os from 'os';
import nock from 'nock';
import path from 'path';
import download, { makeNamefromURL } from '../src';

const host = 'http://www.example.com';
const loadedfileName = 'www-example-com-test.html';
const testingFile = 'expected.html';
const fixtures = '__tests__/__fixtures__';
let expectedData;
let tmpDir;

// hacks
axios.defaults.host = host;
axios.defaults.adapter = httpAdapter;
nock.disableNetConnect();
describe('Testing tool functions', async () => {
  it('makeNamefromURL', (done) => {
    expect(makeNamefromURL('https://ya.ru/')).toBe('ya-ru.html');
    done();
  });
});

describe('Testing page-loader', () => {
  beforeAll(async () => {
    expectedData = await fs.readFileSync(path.join(fixtures, testingFile), 'utf-8');
    tmpDir = await fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  });
  it('load html to file', async (done) => {
    nock(host)
      .get('/test')
      .reply(200, expectedData);
    await download(`${host}/test`, tmpDir);
    const loadedData = await fs.readFileSync(path.join(tmpDir, loadedfileName), 'utf-8');
    expect(loadedData).toBe(expectedData);
    done();
  });
});

