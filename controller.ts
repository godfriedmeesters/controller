require('dotenv').config();
var fs = require('fs');
var path = require('path');
var CronJob = require('cron').CronJob;
import { logger, db, launchComparison, finishedScrapesQueue, erroredScrapesQueue } from './common';


logger.info("Started controller, listening for finished scrapes...");
if (process.env.RUN_CRON == "TRUE") {
  var job = new CronJob(`*/${process.env.SCRAPE_EVERY_SECONDS} * * * * *`, function () {
    logger.info("New job added");

    fs.readdirSync('./comparisons/').forEach(async comparisonFile => {

      let comparisonConfig: any = JSON.parse(fs.readFileSync(path.join('./comparisons/', comparisonFile), 'utf8'));

      launchComparison(comparisonConfig);
    });

  }, null, true, 'Europe/Brussels');
  job.start();

}

finishedScrapesQueue.process((job, done) => {
  logger.info(`${job.data.scraperClass} finished`);
  logger.debug(`Result returned: ${JSON.stringify(job.data)}`);

  (async () => {
    try {
      if (!job.data.params.notSaveInDB) {
        logger.info("Saving in db ");
        const scraper = await db('scraper').where({ name: job.data.scraperClass }).first();

        var scraperRunId = await db('scraperRun').insert({scraperId: scraper.id, comparisonId: job.data.comparisonId, inputData: job.data.inputData, startTime: job.data.startTime, stopTime: job.data.stopTime })
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
      logger.info("Marking scraper command as finshed");
      done(); }

  })();

});

erroredScrapesQueue.process((job, done) => {
  logger.info(`${job.data.scraperClass} errored with {job.data.errors}`);

  (async () => {
    if (!job.data.params.notSaveInDB) {
      logger.info(`${job.data.scraperClass} saving errored scraperrun in db`);
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
      await erroredScrapesQueue.close(1000);
      await finishedScrapesQueue.close(1000);
    } catch (err) {
      console.error('bee-queue failed to shut down gracefully', err);
    }
    process.exit(0);

  })();
});