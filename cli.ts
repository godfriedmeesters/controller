/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-01-22 10:14:13
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2020-12-29 20:34:22
 * @ Description:
 */

var path = require('path');
require('dotenv').config();
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
var fs = require('fs');


import { db, webScraperCommands, launchComparison, addToQueue } from './common';
import { logger } from './logger';


yargs(hideBin(process.argv))
  .command('list', 'List all possible scrapers', (yargs) => {
  }, (argv) => {
    console.log("listing scrapers:");

    db.select('name').from('scraper').then((names) => console.log(names));
  })
  .command('launchComparison [comparisonId]', 'start a comparison', (yargs) => {
    yargs
      .positional('comparisonId', {
        describe: 'ID of comparison in comparison database table'
      })
  }, (argv) => {
    (async () => {
      const comparison = await db('comparison').where({ id: argv.comparisonId }).first()
      await launchComparison(comparison);
      await closeQueues();
    })();
  })
  .command('scrape [scraperClass] [inputDataFile]', 'scrape using one class', (yargs) => {
    yargs
      .positional('scraperClass', {
        describe: 'class to use for scraping',
        default: 'AirFranceWebScraper'
      })
      .positional('inputDataFile', {
        describe: 'class to use for scraping',
        default: 'inputData.json'
      })
      .option('useRealDevice', {
        alias: 'rd',
        type: 'boolean',
        default: false,
        description: 'Run the scraper with a real device instead of emulator'
      })
      .option('notSaveInDB', {
        alias: 'nsvdb',
        type: 'boolean',
        default: false,
        description: 'Do not save the results in database'
      })
      .option('useTestData', {
        alias: 'td',
        type: 'boolean',
        default: false,
        description: 'Let the scraper return test data instead of scraping'
      })
      .option('language', {
        alias: 'lang',
        type: 'string',
        default: "de",
        description: 'Language for browser: de or fr'
      })

  }, (argv) => {

    const inputData = JSON.parse(
      fs.readFileSync(argv.inputDataFile)
    );

    const job = {
      "name": argv.scraperClass,
      "jobCreationTime": new Date(),
      scraperClass: argv.scraperClass, inputData,
      params: { "useRealDevice": argv.useRealDevice, "notSaveInDB": argv.notSaveInDB, "useTestData": argv.useTestData, 'language': argv.language }
    };

    logger.info(`Sending new job ${JSON.stringify(job)}`);
    (async () => {
      await addToQueue(job);
    })();
  })
  .argv

async function closeQueues() {
  try {
    await webScraperCommands.close(1000);
  } catch (err) {
    console.error('bullqueue failed to shut down gracefully', err);
  }
  process.exit(0);
}

