import React, { useEffect, useState, useCallback } from "react";
import InfiniteScroll from "react-infinite-scroller";
import Sticky from "react-stickynode";

import { search, Game, SearchFilters } from "../lib/api";

import GameDisplay from "../components/GameDisplay";
import SearchFiltersMenu from "../components/SearchFiltersMenu";

const HomePage: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters | undefined>();
  const [games, setGames] = useState<Game[]>([]);
  const [searchAfterKey, setSearchAfterKey] = useState<
    (string | number)[] | undefined
  >();
  const [moreResults, setMoreResults] = useState<boolean>(true);

  const loadGames = useCallback(
    async (
      filters: SearchFilters,
      searchAfter?: { games: Game[]; key: (string | number)[] }
    ) => {
      const results = await search(
        filters,
        searchAfter ? searchAfter.key : undefined
      );
      if (results.hits.length !== 0) {
        setSearchAfterKey(results.hits[results.hits.length - 1].sort);
      } else {
        setSearchAfterKey(undefined);
      }

      if (searchAfter) {
        setGames([
          ...searchAfter.games,
          ...results.hits.map((hit) => hit._source),
        ]);
      } else {
        setGames(results.hits.map((hit) => hit._source));
      }
      setMoreResults(
        results.total.value !==
          results.hits.length + (searchAfter ? searchAfter.games.length : 0)
      );
    },
    []
  );

  useEffect(() => {
    if (filters) {
      loadGames(filters);
    }
  }, [filters, loadGames]);

  return (
    <div className="lg:container mx-auto mt-6 mb-4 px-6">
      <div className="flex flex-row">
        <div className="flex-grow-0 flex-shrink-0 w-48 mr-4">
          <Sticky>
            <SearchFiltersMenu
              onChangeFilters={useCallback((filts) => setFilters(filts), [])}
            />
          </Sticky>
        </div>
        <div className="flex-grow">
          <InfiniteScroll
            pageStart={0}
            initialLoad={false}
            loadMore={() => {
              if (searchAfterKey && filters) {
                loadGames(filters, {
                  games: games ? games : [],
                  key: searchAfterKey,
                });
              }
            }}
            hasMore={moreResults}
            loader={
              <div key="loader" className="flex items-center overflow-y-hidden">
                <div
                  className="h-16 w-16 mt-5 mb-2 mx-auto animate-spin ease-linear rounded-full border-4 border-t-4 border-gray-200"
                  style={{ borderTopColor: "#000" }}
                ></div>
              </div>
            }
          >
            {games.map((game) => (
              <GameDisplay key={game.id} game={game} />
            ))}
          </InfiniteScroll>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
