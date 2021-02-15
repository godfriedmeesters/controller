/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-12-27 16:47:23
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-02-15 23:38:32
 * @ Description:  logger
 */


import winston from 'winston';
var path = require('path');
const ecsFormat = require('@elastic/ecs-winston-format');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL,
  format: ecsFormat(),
  transports: [
    new winston.transports.File({ filename: path.join('.', 'logs', 'controller.log') }),
  ]
})


logger.add(new winston.transports.Console({
  format: winston.format.simple(),
}));


export { logger };