'use strict';

const chalk = require(`chalk`);
const fs = require(`fs`).promises;
const {getLogger} = require(`../lib/logger`);
const sequelize = require(`../lib/sequelize`);
const defineModels = require(`../models`);
const Aliase = require(`../models/aliase`);
const {ExitCode} = require(`../../constants`);
const {
  getRandomInt,
  getRandomSubarray,
  shuffle,
} = require(`../../utils`);

const DEFAULT_COUNT = 1;
const MAX_COUNT = 1000;
const MAX_COMMENTS = 4;
const FILE_SENTENCES_PATH = `./data/sentences.txt`;
const FILE_TITLES_PATH = `./data/titles.txt`;
const FILE_CATEGORIES_PATH = `./data/categories.txt`;
const FILE_COMMENTS_PATH = `./data/comments.txt`;

const OfferType = {
  OFFER: `offer`,
  SALE: `sale`,
};

const SumRestrict = {
  MIN: 1000,
  MAX: 100000,
};

const PictureRestrict = {
  MIN: 1,
  MAX: 16,
};

const logger = getLogger({name: `api`});

const getPictureFileName = (number) => `item${number.toString().padStart(2, 0)}.jpg`;

const generateComments = (count, comments) => (
  Array(count).fill({}).map(() => ({
    text: shuffle(comments)
      .slice(0, getRandomInt(1, 3))
      .join(` `),
  }))
);

const readContent = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, `utf8`);
    return content.trim().split(/\r?\n/);
  } catch (err) {
    console.error(chalk.red(err));
    return [];
  }
};

const generateOffers = (count, titles, categories, sentences, comments) => (
  Array(count).fill({}).map(() => ({
    categories: getRandomSubarray(categories),
    description: shuffle(sentences).slice(1, 5).join(` `),
    picture: getPictureFileName(getRandomInt(PictureRestrict.MIN, PictureRestrict.MAX)),
    title: titles[getRandomInt(0, titles.length - 1)],
    type: OfferType[Object.keys(OfferType)[Math.floor(Math.random() * Object.keys(OfferType).length)]],
    sum: getRandomInt(SumRestrict.MIN, SumRestrict.MAX),
    comments: generateComments(getRandomInt(1, MAX_COMMENTS), comments)
  }))
);

module.exports = {
  name: `--filldb`,
  async run(args) {
    const [count] = args;

    if (count > MAX_COUNT) {
      console.error(chalk.red(`Не больше ${MAX_COUNT} записей.`));
      process.exit(ExitCode.error);
    }

    try {
      logger.info(`Trying to connect to database...`);
      await sequelize.authenticate();
    } catch (err) {
      logger.error(`An error occurred: ${err.message}`);
      process.exit(ExitCode.error);
    }
    logger.info(`Connection to database established`);

    const {Category, Offer} = defineModels(sequelize);
    await sequelize.sync({force: true});

    const countOffer = Number.parseInt(count, 10) || DEFAULT_COUNT;
    const titles = await readContent(FILE_TITLES_PATH);
    const categories = await readContent(FILE_CATEGORIES_PATH);
    const sentences = await readContent(FILE_SENTENCES_PATH);
    const comments = await readContent(FILE_COMMENTS_PATH);

    const categoryModels = await Category.bulkCreate(
        categories.map((item) => ({name: item}))
    );

    const offers = generateOffers(countOffer, titles, categoryModels, sentences, comments);

    const offerPromises = offers.map(async (offer) => {
      const offerModel = await Offer.create(offer, {include: [Aliase.COMMENTS]});
      await offerModel.addCategories(offer.categories);
    });

    try {
      logger.info(`Trying to fill database...`);
      await Promise.all(offerPromises);
      logger.info(`Database filled successfully!`);
    } catch (error) {
      logger.error(`Database filling error: ${error.message}`);
      process.exit(ExitCode.error);
    }
  }
};
