/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-17 21:36:33
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-02-11 23:28:14
 * @ Description:
 */

// TODO:add container id to scraper run



require('dotenv').config();

var CronJob = require('cron').CronJob;
import { db, launchComparison, finishedScrapes, erroredScrapes, sleep } from './common';

import { logger } from './logger';

logger.info("Started controller, listening for finished scrapes...");
if (process.env.RUN_CRON) {
  logger.info(`Starting cron job to automatically launch comparisons with timing ${process.env.CRON}`)
  var job = new CronJob(process.env.CRON, function () {
    logger.info("CRON event fired");

    (async () => {
      const comparisons = await db('comparison').select('*');

      logger.info("Going to launch all comparisons");
      for (var comparison of comparisons) {
        if (comparison.enabled) {
          launchComparison(comparison);
          // for every scraper in the comparison, add a delay of 800 seconds
          const sleepTime = 800 * 1000 * comparison.comparisonConfig.scrapers.length;
          logger.info(`Sleeping ${sleepTime} `);
          await sleep(sleepTime);
        }
        else {
          logger.info(`Comparison ${comparison.id} disabled, skipping`);
        }
      }

    })();

  }, null, true, 'Europe/Brussels');
  job.start();
}

finishedScrapes.process((job, done) => {
  logger.info(`${job.data.scraperClass} sucessfully finished`);
  logger.debug(`Result returned: ${JSON.stringify(job.data)}`);

  (async () => {
    try {
      if (!job.data.params.notSaveInDB && "items" in job.data) {
        logger.info("Saving items in db ");
        const scraper = await db('scraper').where({ name: job.data.scraperClass }).first();

        var scraperRunId = await db('scraperRun').insert({ scraperId: scraper.id, comparisonId: job.data.comparisonId, comparisonRunId: job.data.comparisonRunId, inputData: job.data.inputData, startTime: job.data.startTime, stopTime: job.data.stopTime, hostName: job.data.hostName })
          .returning('id');

        for (var item of job.data.items) {
          await db('scraperRunResult').insert({ scraperRunId: scraperRunId[0], scraperId: scraper.id, result: JSON.parse(JSON.stringify(item)) });
        }
      }
      else {
        logger.info("Skip saving in db ");
      }
    }
    catch (exception) {
      logger.error(exception);

    } finally {
      logger.info("Marking scraper command as finished");
      done();
    }

  })();

});

erroredScrapes.process((job, done) => {
  logger.error(`${job.data.scraperClass}: errored with ${JSON.stringify(job.data.errors)}`);

  (async () => {
    if (!job.data.params.notSaveInDB) {
      logger.info(`${job.data.scraperClass}: saving errored scraperrun in db`);
      const scraper = await db('scraper').where({ name: job.data.scraperClass }).first();

      await db('scraperRun').insert({ errors: job.data.errors, inputData: job.data.inputData });

    }
    else {
      logger.info("Skip saving in db ");
    }

    done();
  })();

});


process.on("SIGINT", function () {
  console.log("\ngracefully shutting down from SIGINT (Crtl-C)");
  (async () => {
    try {
      await erroredScrapes.close(1000);
      await finishedScrapes.close(1000);
    } catch (err) {
      console.error('bull-queue failed to shut down gracefully', err);
    }
    process.exit(0);

  })();
});