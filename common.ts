/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-23 17:58:06
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-01-09 22:06:27
 * @ Description:
 */



var Queue = require('bull');
const yn = require('yn');

import { logger } from './logger';

export const db = require("knex")({
  client: "pg",
  connection: {
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASS,
    database: process.env.PG_DATABASE
  }
});

const queueOptions = {
  //removeOnSuccess: true,
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASS,
  },
}

export const emulatedDeviceScraperCommands = new Queue('emulatedDeviceScraperCommands', queueOptions);
export const realDeviceScraperCommands = new Queue('realDeviceScraperCommands', queueOptions);
export const webScraperCommands = new Queue('webScraperCommands', queueOptions);
export const finishedScrapes = new Queue('finishedScrapes', queueOptions);
export const erroredScrapes = new Queue('erroredScrapes', queueOptions);

export async function addToQueue(job: any) {
  if (job.scraperClass.includes("Web")) {
    logger.info(`Adding job ${JSON.stringify(job)} to webScraperCommands`)
    await webScraperCommands.add( job);
  }
  else
    if (job.scraperClass.includes("App") && yn(job.params.useRealDevice)) {
      logger.info(`Adding job ${JSON.stringify(job)} to realDeviceScraperCommands`)
      await realDeviceScraperCommands.add( job);
    }
    else
      if (job.scraperClass.includes("App")) {
        logger.info(`Adding job ${JSON.stringify(job)} to emulatedDeviceScraperCommands`)
        await emulatedDeviceScraperCommands.add( job);
      }
}

export async function launchComparison(comparison: any) {
  logger.info(`Launching comparison ${JSON.stringify(comparison)} `);
  const inputData = comparison.comparisonConfig.inputData;
  const comparisonId = comparison.id;
  const startTime = new Date();

  var comparisonRunId = await db('comparisonRun').insert({ startTime, comparisonId })
    .returning('id');

  for (let scraper of comparison.comparisonConfig.scrapers) {
    const job = { comparisonRunId, comparisonId, params: scraper.params, scraperClass: scraper.scraperClass, inputData };

    await addToQueue(job);
  }
}