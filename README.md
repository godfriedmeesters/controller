# DiffScraper Controller

As part of  [DiffScraper](https://github.com/godfriedmeesters/diffscraper "DiffScraper"), the controller sends jobs to scraping bots, and collects the offers extracted by bots.

## System Requirements

DiffScraper Controller needs a connection to a central Redis database (to send jobs to bots).  In addition, to store offers returned by bots, a PostgreSQL database needs to be available.  Redis and PostgreSQL connection details can be set through the enviromental variables defined in [.env](https://github.com/godfriedmeesters/controller/blob/main/.env ".env").

## Installation Guide

A controller can be started as follows:
`docker-compose up -f docker-compose.controller.yml -d`

Several environmental variables can be changed; for example the variable `CRON` defines the interval between which comparisons are executed.  


## DiffScraper Controller CLI

In a production system, a bot receives scraping jobs via a central Redis queue from the [controller](https://github.com/godfriedmeesters/controller "controller").  

To test a (new) bot, it is possible to bypass the job queue and test the bot locally from within its Docker container.

For example, to start scraping offers from the French website of Opodo:

Enter  into an Opodo bot:
`kubectl --kubeconfig="my-kubeconfig.yaml" exec --stdin --tty  webscraper-deployment--1   -- /bin/bash`

This command will extract all offers from opodo.fr:
`ts-node scrape OpodoWebScraper inputData.json --lang=fr`
