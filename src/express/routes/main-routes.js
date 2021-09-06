"use strict";

const {Router} = require(`express`);
const mainRouter = new Router();
const api = require(`../api`).getAPI();

mainRouter.get(`/`, async (req, res) => {
  const [
    offers,
    categories
  ] = await Promise.all([
    api.getOffers(),
    api.getCategories({count: true})
  ]);

  res.render(`main`, {offers, categories});
});

mainRouter.get(`/register`, (req, res) => res.render(`sign-up`));

mainRouter.get(`/login`, (req, res) => res.render(`login`));

mainRouter.get(`/search`, async (req, res) => {
  try {
    const {query} = req.query;
    const results = await api.search(query);

    res.render(`search-result`, {results});
  } catch (error) {
    res.render(`search-result`, {
      results: []
    });
  }
});

mainRouter.get(`/404`, (req, res) => res.render(`errors/404`));

mainRouter.get(`/500`, (req, res) => res.render(`errors/500`));

module.exports = mainRouter;
