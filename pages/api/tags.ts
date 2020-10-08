import { NextApiRequest, NextApiResponse } from "next";

import { Tag, Tags } from "../../lib/api";
import db from "../../lib/db";

type TagWithType = Tag & { type: string };

type Result = {
  sort: unknown;
  _source: TagWithType;
};

const loadPage = async (search_after?: unknown): Promise<Result[]> => {
  const { body: results } = await db.search({
    index: "tags",
    body: {
      size: 10,
      search_after,
      sort: ["id"],
      query: {
        match_all: {},
      },
    },
  });
  return results.hits.hits;
};

const loadTags = async (): Promise<TagWithType[]> => {
  const tags = [];
  let results = await loadPage();
  while (results.length) {
    tags.push(...results.map((item) => item._source));
    results = await loadPage(results[results.length - 1].sort);
  }
  return tags;
};

const filterByType = (tags: TagWithType[], type: string): Tag[] => {
  return tags
    .filter((tag) => tag.type === type)
    .map((tag) => ({ id: tag.id, name: tag.name }));
};

export default async (
  _req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const tags = await loadTags();
  const body: Tags = {
    mechanics: filterByType(tags, "mechanic"),
    themes: filterByType(tags, "category"),
  };
  res.setHeader("cache-control", "s-maxage=86400, stale-while-revalidate"); // cache for a day
  return res.status(200).json(body);
};
