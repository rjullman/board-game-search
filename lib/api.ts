import {
  encodeQueryParams,
  BooleanParam,
  StringParam,
  ArrayParam,
  NumericArrayParam,
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
  thumbnail?: string;
  description?: string;
  brief_description?: string;
  expected_playtime: number;
  min_playtime: number;
  max_playtime: number;
  min_players: number;
  max_players: number;
  min_age: number;
  weight?: number;
  rating: number;
  num_ratings: number;
  year_published: number;
  categories: EntityLink[];
  mechanics: EntityLink[];
  families: EntityLink[];
  expansions: EntityLink[];
};

type Hit = {
  sort?: (string | number)[];
  _source: Game;
};

type Results = {
  hits: Hit[];
  total: { relation: "eq"; value: number };
};

export enum Filters {
  SortByRelevance = "relevance",
  SortByRank = "rank",
  SortByRating = "rating",
  SortByWeight = "weight",

  RatingAny = "any",
  Rating2Plus = "2p",
  Rating5Plus = "5p",
  Rating8Plus = "8p",

  Age0To4 = "0t4",
  Age5To10 = "5t10",
  Age11To17 = "11t17",
  Age18To20 = "18t20",
  Age21Plus = "21p",

  Weight1to2 = "1t2",
  Weight2to3 = "2t3",
  Weight3to4 = "3t4",
  Weight4to5 = "4t5",

  Playtime0to30 = "0t30",
  Playtime30to60 = "30t60",
  Playtime60to120 = "60t120",
  Playtime120Plus = "120p",

  Players1 = "1",
  Players2 = "2",
  Players3 = "3",
  Players4 = "4",
  Players5Plus = "5p",

  RankAny = "any",
  RankTop100 = "t100",
  RankTop500 = "t500",
  RankTop2500 = "t2500",

  RatingCountAny = "any",
  RatingCount100Plus = "100p",
  RatingCount1000Plus = "1kp",
  RatingCount10000Plus = "10kp",
}

export type SearchFilters = {
  keywords: string;
  sort: string;
  reverse: boolean;
  rank: string;
  rating: string;
  ratingCount: string;
  weight: string[];
  age: string[];
  playtime: string[];
  players: string[];
  mechanics: number[];
  themes: number[];
};

export async function search(
  filters: SearchFilters,
  searchAfterKey: (string | number)[] = []
): Promise<Results> {
  const encodedQuery = encodeQueryParams(
    {
      keywords: StringParam,
      sort: StringParam,
      reverse: BooleanParam,
      rank: StringParam,
      rating: StringParam,
      ratingCount: StringParam,
      age: ArrayParam,
      weight: ArrayParam,
      playtime: ArrayParam,
      players: ArrayParam,
      mechanics: NumericArrayParam,
      themes: NumericArrayParam,
      searchAfterKey: ArrayParam,
    },
    {
      ...filters,
      searchAfterKey: searchAfterKey.map((part: string | number) => {
        return part.toString();
      }),
    }
  );
  const response = await fetch(`/api/search?${stringify(encodedQuery)}`);
  const results = (await response.json()) as Results;
  return results;
}

export type Tag = {
  id: number;
  name: string;
};

export type Tags = {
  mechanics: Tag[];
  themes: Tag[];
};

export async function loadTags(): Promise<Tags> {
  const response = await fetch("/api/tags");
  const results = (await response.json()) as Tags;
  return results;
}
