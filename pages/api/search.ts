import { NextApiRequest, NextApiResponse } from "next";

import db from "../../lib/db";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const query = req.query["q"];
  if (typeof query != "string" || !query) {
    return res.status(200).json({ hits: [] });
  }
  const { body: results } = await db.search({
    index: "boardgames",
    body: {
      query: {
        query_string: {
          query: query + "~*",
          default_field: "name",
        },
      },
    },
  });
  return res.status(200).json(results["hits"]);
};
