import { NextApiRequest, NextApiResponse } from "next";

import { Filters } from "../../lib/api";
import db from "../../lib/db";

const AGE_RANGES = {
  [Filters.Age0To4]: { range: { min_age: { gte: 0, lte: 4 } } },
  [Filters.Age5To10]: { range: { min_age: { gte: 5, lte: 10 } } },
  [Filters.Age11To17]: { range: { min_age: { gte: 11, lte: 17 } } },
  [Filters.Age18To20]: { range: { min_age: { gte: 18, lte: 20 } } },
  [Filters.Age21Plus]: { range: { min_age: { gte: 21 } } },
};

const RATING_RANGES = {
  [Filters.Rating2Plus]: { range: { rating: { gte: 2 } } },
  [Filters.Rating5Plus]: { range: { rating: { gte: 5 } } },
  [Filters.Rating8Plus]: { range: { rating: { gte: 8 } } },
};

const WEIGHT_RANGES = {
  [Filters.Weight1to2]: { range: { weight: { gte: 1, lte: 2 } } },
  [Filters.Weight2to3]: { range: { weight: { gte: 2, lte: 3 } } },
  [Filters.Weight3to4]: { range: { weight: { gte: 3, lte: 4 } } },
  [Filters.Weight4to5]: { range: { weight: { gte: 4, lte: 5 } } },
};

const PLAYTIME_RANGES = {
  [Filters.Playtime0to30]: {
    bool: {
      must: [
        { range: { min_playtime: { lte: 30 } } },
        { range: { max_playtime: { gte: 0 } } },
      ],
    },
  },
  [Filters.Playtime30to60]: {
    bool: {
      must: [
        { range: { min_playtime: { lte: 60 } } },
        { range: { max_playtime: { gte: 30 } } },
      ],
    },
  },
  [Filters.Playtime60to120]: {
    bool: {
      must: [
        { range: { min_playtime: { lte: 120 } } },
        { range: { max_playtime: { gte: 60 } } },
      ],
    },
  },
  [Filters.Playtime120Plus]: { range: { max_playtime: { gte: 120 } } },
};

const PLAYERS_RANGES = {
  [Filters.Players1]: {
    bool: {
      must: [
        { range: { min_players: { lte: 1 } } },
        { range: { max_players: { gte: 1 } } },
      ],
    },
  },
  [Filters.Players2]: {
    bool: {
      must: [
        { range: { min_players: { lte: 2 } } },
        { range: { max_players: { gte: 2 } } },
      ],
    },
  },
  [Filters.Players3]: {
    bool: {
      must: [
        { range: { min_players: { lte: 3 } } },
        { range: { max_players: { gte: 3 } } },
      ],
    },
  },
  [Filters.Players4]: {
    bool: {
      must: [
        { range: { min_players: { lte: 4 } } },
        { range: { max_players: { gte: 4 } } },
      ],
    },
  },
  [Filters.Players5Plus]: { range: { max_players: { gte: 5 } } },
};

function createFilterClause(
  ranges: Record<string, unknown>,
  params?: string | string[]
): Record<string, unknown> | undefined {
  if (!params) {
    return undefined;
  }
  const filters = (typeof params === "string" ? [params] : params)
    .filter((item) => Object.keys(ranges).some((filt) => filt === item))
    .map((item) => ranges[item]);
  return filters.length !== 0 ? { bool: { should: filters } } : undefined;
}

function createSortClause(params?: string | string[]) {
  if (!params) {
    return undefined;
  }
  switch (typeof params === "string" ? params : params[0]) {
    case Filters.SortByRatingDec:
      return { rating: { order: "desc" } };
    case Filters.SortByRatingInc:
      return { rating: { order: "asc" } };
    case Filters.SortByWeightDec:
      return { weight: { order: "desc" } };
    case Filters.SortByWeightInc:
      return { weight: { order: "asc" } };
    default:
      return undefined;
  }
}

function createSearchKeywordsClause(params?: string | string[]) {
  if (!params) {
    return [];
  }
  const query = (typeof params === "string" ? params : params.join(" ")).trim();
  return [
    {
      multi_match: {
        query,
        type: "bool_prefix",
        fields: ["name^10", "description"],
        operator: "and",
      },
    },
  ];
}

function createSearchAfterClause(params?: string | string[]) {
  if (!params) {
    return undefined;
  }
  return (typeof params === "string" ? [params] : params).map(
    (item, i, arr) => {
      if (i !== arr.length - 1) {
        if (item.includes(".")) {
          return Number.parseFloat(item);
        }
        return Number.parseInt(item);
      }
      return item;
    }
  );
}

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const { body: results } = await db.search({
    index: "boardgames",
    body: {
      size: 10,
      search_after: createSearchAfterClause(req.query["searchAfterKey"]),
      sort: [
        createSortClause(req.query["sort"]),
        "_score",
        req.query["keywords"] ? undefined : { rank: { order: "asc" } },
        "_id",
      ].filter((clause) => clause !== undefined),
      query: {
        bool: {
          filter: [
            createFilterClause(AGE_RANGES, req.query["age"]),
            createFilterClause(RATING_RANGES, req.query["rating"]),
            createFilterClause(WEIGHT_RANGES, req.query["weight"]),
            createFilterClause(PLAYTIME_RANGES, req.query["playtime"]),
            createFilterClause(PLAYERS_RANGES, req.query["players"]),
          ].filter((filt) => filt != undefined),
          should: [...createSearchKeywordsClause(req.query["keywords"])],
        },
      },
    },
  });
  return res.status(200).json(results["hits"]);
};
