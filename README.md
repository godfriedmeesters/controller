# DiffScraper Controller

As part of  [DiffScraper](https://github.com/godfriedmeesters/diffscraper "DiffScraper"), the controller sends jobs to scraping bots, and collects the offers extracted by [bots](https://github.com/godfriedmeesters/scraper "bots").

## System Requirements

DiffScraper Controller needs a connection to a central Redis database (to send jobs to bots).  In addition, to store offers returned by bots, a PostgreSQL database needs to be available.  Redis and PostgreSQL connection details can be set through the enviromental variables defined in [.env](https://github.com/godfriedmeesters/controller/blob/main/.env ".env"). 

The DDL for the PostgreSQL database, including predefined scraping bots and comparisons, can be found [here]( https://github.com/godfriedmeesters/controller/blob/main/config/PostgreSQL_Backup_20210826 "here"). 

## Installation Guide

A controller can be started as follows:
`docker-compose up -f docker-compose.controller.yml -d`

Several environmental variables can be changed; for example the variable `CRON` defines the interval between which comparisons are executed.  


## DiffScraper Controller CLI

In a production system, comparisons are launched through a CRON scheduler. For testing purposes, it is also possible to launch comparisons directly through a CLI. 

For example, to launch comparison 13 defined in the PostgreSQL comparisons table:

Enter  the controller container:
`docker exec -it  controller bash`

This command will launch comparison 13:
`ts-node cli.ts launchComparison 13`

As with the launch of a scheduled comparison, for every outlet defined in a comparison, a scraping job will be created on one of the Redis queues, that will in turn be pulled by bots.
