/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-17 21:36:33
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-05-09 11:56:58
 * @ Description:
 */


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


          const synSeconds = parseInt(process.env.MAX_SYNCHRONIZATION_SECONDS);  //sync seconds on start & search fore every scraper in comparison
          const timeoutBeforeSearch = parseInt(process.env.TIMEOUT_SECONDS_BEFORE_SEARCH);  //max time for scrapeBeforeSearch
          const timeoutAfterSearch = parseInt(process.env.TIMEOUT_SECONDS_AFTER_SEARCH); //max time for scrapeAfterSearch


          logger.info(`Controller: synSeconds = ${synSeconds}`);
          logger.info(`Controller: timeoutBeforeSearch = ${timeoutBeforeSearch}`);
          logger.info(`Controller: timeoutAfterSearch = ${timeoutAfterSearch}`);

          //(δ+α+2⋅β)⋅n  ms
          const sleepTime = (timeoutBeforeSearch + timeoutAfterSearch + synSeconds * 2) * comparison.comparisonConfig.scrapers.length * 1000;

          logger.info(`Controller: Sleeping ${sleepTime} ms until next comparison run`);
          await sleep(sleepTime);
        }
        else {
          logger.info(`Controller: Comparison ${comparison.id} disabled, skipping`);
        }
      }

    })();

  }, null, true, 'Europe/Brussels');
  job.start();
}

finishedScrapes.process((job, done) => {
  logger.info(`Controller: ${job.data.scraperClass} finished without exceptions`);
  logger.info("Got Offers: " + JSON.stringify(job.data));


  (async () => {
    try {
      if (!job.data.params.notSaveInDB && "items" in job.data) {
        logger.info("Controller: Saving items in db ");
        const scraper = await db('scraper').where({ name: job.data.scraperClass }).first();

        var scraperRunId = await db('scraperRun').insert({ scraperId: scraper.id, comparisonId: job.data.comparisonId, comparisonRunId: job.data.comparisonRunId, inputData: job.data.inputData, startTime: job.data.startTime, stopTime: job.data.stopTime, hostName: job.data.hostName })
          .returning('id');


        if (!('sortedByBest' in job.data.items && 'sortedByCheapest' in job.data.items)) {
          for (var i = 0; i < job.data.items.length; i++) {
            await db('scraperRunResult').insert({ scraperRunId: scraperRunId[0], scraperId: scraper.id,sortedBy: "sortedByBest", result: JSON.parse(JSON.stringify(job.data.items[i])) });
          }
        }
        else {
          for (var i = 0; i < job.data.items.sortedByBest.length; i++) {
            await db('scraperRunResult').insert({ scraperRunId: scraperRunId[0], scraperId: scraper.id, sortedBy: "sortedByBest", result: JSON.parse(JSON.stringify(job.data.items.sortedByBest[i])) });

          }
          for (var i = 0; i < job.data.items.sortedByCheapest.length; i++) {
            await db('scraperRunResult').insert({ scraperRunId: scraperRunId[0], scraperId: scraper.id, sortedBy: "sortedByCheapest", result: JSON.parse(JSON.stringify(job.data.items.sortedByCheapest[i])) });

          }
        }
      }
      else {
        logger.info("Skip saving in db ");
      }
    }
    catch (exception) {
      logger.error(exception);

    } finally {
      logger.info(`Controller: Marking scraper run of ${job.data.scraperClass} command as finished in queue`);
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

      await db('scraperRun').insert({ errors: job.data.errors, inputData: job.data.inputData, scraperId: scraper.id, comparisonId: job.data.comparisonId });

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