"use strict";

const express = require(`express`);
const sequelize = require(`../lib/sequelize`);
const {getLogger} = require(`../lib/logger`);
const routes = require(`../api`);
const apiLogger = require(`../middlewares/api-logger`);
const routeExist = require(`../middlewares/route-exist`);
const apiErorr = require(`../middlewares/api-error`);

const API_PREFIX = `/api`;
const DEFAULT_PORT = 3000;

const app = express();
const logger = getLogger({name: `api`});
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use(apiLogger);
app.use(API_PREFIX, routes);
app.use(routeExist);
app.use(apiErorr);

module.exports = {
  name: `--server`,
  async run(args) {
    const [customPort] = args;
    const port = Number.parseInt(customPort, 10) || DEFAULT_PORT;

    try {
      logger.info(`Trying to connect to database...`);
      await sequelize.authenticate();
    } catch (err) {
      logger.error(`An error occurred: ${err.message}`);
      process.exit(1);
    }
    logger.info(`Connection to database established`);

    app
      .listen(port, () => {
        return logger.info(`Listening to connections on ${port}`);
      })
      .on(`error`, (err) => {
        return logger.error(
            `An error occurred on server creation: ${err.message}`
        );
      });
  },
};
