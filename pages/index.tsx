import React, { useEffect, useState } from "react";

import { search, Game } from "../lib/api";

const Combobox: React.FC<{}> = () => {
  const [query, setQuery] = useState<string>("");
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    const load = async () => {
      if (query) {
        const results = await search(query);
        setGames(results.hits.map((hit) => hit._source));
      }
    };
    load();
  }, [query]);

  return (
    <React.Fragment>
      <input onChange={(e) => setQuery(e.target.value)} />
      {games.map((game) => (
        <div key={game.id}>
          {game.name} (rank {game.rank})
        </div>
      ))}
    </React.Fragment>
  );
};

const HomePage: React.FC<{}> = () => <Combobox />;

export default HomePage;
