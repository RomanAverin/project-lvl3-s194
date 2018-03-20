#!/usr/bin/env node

import program from 'commander';
import download from '..';
import { version, description } from '../../package.json';

program
  .version(version)
  .description(description)
  .option('-o, --output [path]', 'path to output [path]')
  .arguments('<link>')
  .action((link, option) => {
    download(link, option.output);
  })
  .parse(process.argv);
