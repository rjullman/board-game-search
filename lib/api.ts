export type Game = {
  id: number;
  rank: number;
  name: string;
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
