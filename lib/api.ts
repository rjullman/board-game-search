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

export async function search(query: string) {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const results = (await response.json()) as Results;
  return results;
}
