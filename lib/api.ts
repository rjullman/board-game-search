import {
  encodeQueryParams,
  StringParam,
  ArrayParam,
} from "serialize-query-params";
import { stringify } from "query-string";

type EntityLink = {
  id: number;
  name: string;
};

export type Game = {
  id: number;
  slug: string;
  name: string;
  rank: number;
  thumbnail: string;
  description: string;
  expected_playtime: number;
  min_playtime: number;
  max_playtime: number;
  min_players: number;
  max_players: number;
  min_age: number;
  weight: number;
  rating: number;
  year_published: number;
  categories: EntityLink[];
  mechanics: EntityLink[];
  families: EntityLink[];
  expansions: EntityLink[];
};

type Hit = {
  _source: Game;
};

type Results = {
  hits: Hit[];
};

export enum Filters {
  SortByRelevance = "relevance",
  SortByRatingDec = "rating-dec",
  SortByRatingInc = "rating-inc",
  SortByWeightDec = "weight-dec",
  SortByWeightInc = "weight-inc",

  RatingAny = "any",
  Rating2Plus = "2.0+",
  Rating5Plus = "5.0+",
  Rating8Plus = "8.0+",

  Age0To4 = "0–4",
  Age5To10 = "5–10",
  Age11To17 = "11–17",
  Age18To20 = "18–20",
  Age21Plus = "21+",

  Weight1to2 = "1.0–2.0",
  Weight2to3 = "2.0–3.0",
  Weight3to4 = "3.0–4.0",
  Weight4to5 = "4.0–5.0",

  Playtime0to30 = "0–30",
  Playtime30to60 = "30–60",
  Playtime60to120 = "60–120",
  Playtime120Plus = "120+",

  Players1 = "1",
  Players2 = "2",
  Players3 = "3",
  Players4 = "4",
  Players5Plus = "5+",
}

export type SearchFilters = {
  keywords: string;
  sort: string;
  rating: string;
  weight: string[];
  age: string[];
  playtime: string[];
  players: string[];
};

export async function search(filters: SearchFilters) {
  const encodedQuery = encodeQueryParams(
    {
      keywords: StringParam,
      sort: StringParam,
      rating: StringParam,
      age: ArrayParam,
      weight: ArrayParam,
      playtime: ArrayParam,
      players: ArrayParam,
    },
    filters
  );
  const response = await fetch(`/api/search?${stringify(encodedQuery)}`);
  const results = (await response.json()) as Results;
  return results;
}
