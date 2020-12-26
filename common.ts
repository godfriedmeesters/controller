var Queue = require('bull');
import { pathToFileURL } from 'url';
import winston from 'winston';
const ecsFormat = require('@elastic/ecs-winston-format');
require('dotenv').config();
var path = require('path');


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
  
  export const scraperCommandQueue = new Queue('scraperCommands', queueOptions);
  export const finishedScrapesQueue = new Queue('finishedScrapes', queueOptions);
  export const erroredScrapesQueue = new Queue('erroredScrapes',queueOptions);

  export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL,
    format: ecsFormat(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join('.', 'logs' , 'controller.log') }),
    ]
})

  export async function launchComparison(comparisonConfig) {
    const inputData = comparisonConfig.inputData;
    const startTime = new Date();

    var comparisonId = await db('comparison').insert({ startTime, comparisonConfig })
      .returning('id');

    for (let scraper of comparisonConfig.scrapers) {
      const job = { "comparisonId": comparisonId[0], params: scraper.params, scraperClass: scraper.scraperClass, inputData };
      logger.info(`Adding new job to queue ${JSON.stringify(job)} `);

      scraperCommandQueue.add(job);
    }
  }

