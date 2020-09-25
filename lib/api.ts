export type Game = {
  id: number;
  rank: number;
  name: string;
  thumbnail: string;
  expected_playtime: number;
  min_playtime: number;
  max_playtime: number;
  min_players: number;
  max_players: number;
  min_age: number;
  weight: number;
  rating: number;
  year_published: number;
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
