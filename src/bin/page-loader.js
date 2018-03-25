#!/usr/bin/env node

import program from 'commander';
import download, { errorHandler } from '..';
import { version, description } from '../../package.json';

program
  .version(version)
  .description(description)
  .option('-o, --output [path]', 'path to output [path]')
  .arguments('<link>')
  .action((link, option) => {
    download(link, option.output)
      .catch((error) => {
        const errorMessage = errorHandler(error);
        console.error(errorMessage);
        if (error.path) {
          console.error(error.path);
        }
        if (error.config) {
          console.error(error.config.url);
        }
        process.exit(1);
      });
  })
  .parse(process.argv);
