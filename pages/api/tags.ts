import { NextApiRequest, NextApiResponse } from "next";

import { Tag, Tags } from "../../lib/api";
import db from "../../lib/db";

enum TagType {
  Mechanics = "mechanics",
  Themes = "themes",
}

const loadPage = async (
  type: TagType,
  afterKey?: unknown
): Promise<{
  after_key: unknown;
  buckets: { key: Tag }[];
}> => {
  const path = () => {
    switch (type) {
      case TagType.Mechanics:
        return "mechanics";
      case TagType.Themes:
        return "categories";
      default:
        throw new Error(`Unknown tag type '${type}'.`);
    }
  };
  const { body: results } = await db.search({
    index: "boardgames",
    body: {
      size: 0,
      track_total_hits: false,
      aggs: {
        tag: {
          nested: {
            path: path(),
          },
          aggs: {
            tag_distinct: {
              composite: {
                size: 10,
                sources: [
                  { id: { terms: { field: `${path()}.id` } } },
                  {
                    name: {
                      terms: { field: `${path()}.name.keyword` },
                    },
                  },
                ],
                after: afterKey,
              },
            },
          },
        },
      },
    },
  });
  return results.aggregations.tag.tag_distinct;
};

const loadTags = async (type: TagType): Promise<Tag[]> => {
  const tags = [];
  let results = await loadPage(type);
  while (results.buckets.length) {
    tags.push(...results.buckets.map((item) => item.key));
    results = await loadPage(type, results.after_key);
  }
  return tags;
};

export default async (
  _req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const mechanics = await loadTags(TagType.Mechanics);
  const themes = await loadTags(TagType.Themes);
  const body: Tags = {
    mechanics,
    themes,
  };
  res.setHeader("cache-control", "s-maxage=86400, stale-while-revalidate"); // cache for a day
  return res.status(200).json(body);
};
