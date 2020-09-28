import React, { useEffect, useState, useCallback, useRef } from "react";
import InfiniteScroll from "react-infinite-scroller";
import Sticky from "react-stickynode";

import { search, Game, SearchFilters } from "../lib/api";

import GameDisplay from "../components/GameDisplay";
import HelpTooltip from "../components/HelpTooltip";
import SearchFiltersMenu from "../components/SearchFiltersMenu";

const HomePage: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchAfterKey, setSearchAfterKey] = useState<any[] | undefined>();
  const searchInput = useRef<HTMLInputElement>(null);

  const loadGames = async (
    filters: SearchFilters,
    loadMore: boolean = false
  ) => {
    if (loadMore && !searchAfterKey) {
      return;
    }

    const results = await search(
      filters,
      loadMore ? searchAfterKey : undefined
    );
    if (results.hits.length !== 0) {
      setSearchAfterKey(results.hits[results.hits.length - 1].sort);
    } else {
      setSearchAfterKey(undefined);
    }

    if (loadMore) {
      return setGames([...games, ...results.hits.map((hit) => hit._source)]);
    }
    return setGames(results.hits.map((hit) => hit._source));
  };

  useEffect(() => {
    loadGames(filters, false);
  }, [
    filters.keywords,
    filters.sort,
    filters.rating,
    JSON.stringify(filters.weight),
    JSON.stringify(filters.age),
    JSON.stringify(filters.playtime),
    JSON.stringify(filters.players),
  ]);

  return (
    <div className="container mx-auto mb-6 px-6">
      <div className="pt-6 pb-3">
        <input
          ref={searchInput}
          className="form-input mx-auto w-3/4 md:w-2/3 lg:w-1/2 min-w-full md:min-w-0 block shadow appearance-none text-gray-700"
          onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
        />
      </div>
      <div className="flex flex-row">
        <div className="flex-grow-0 flex-shrink-0 w-48 mr-4">
          <Sticky>
            <SearchFiltersMenu onChangeFilters={(filts) => setFilters(filts)} />
          </Sticky>
        </div>
        <div className="flex-grow">
          <InfiniteScroll
            pageStart={0}
            initialLoad={false}
            loadMore={() => loadGames(filters, true)}
            hasMore={true}
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
