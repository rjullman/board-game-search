import React, { useEffect, useState, useCallback } from "react";
import InfiniteScroll from "react-infinite-scroller";
import classnames from "classnames";
import Sidebar from "react-sidebar";

import { search, Game, SearchFilters, Filters } from "../lib/api";

import FilterIcon from "../components/FilterIcon";
import GameDisplay from "../components/GameDisplay";
import NoSearchResults from "../components/NoSearchResults";
import SearchFiltersMenu from "../components/SearchFiltersMenu";

const ShowFiltersButton: React.FC<{
  showDot?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}> = ({ onClick, showDot = false }) => (
  <div className="fixed top-0 left-0 pt-6 pl-6 sm:hidden z-30">
    <button
      className="relative form-button w-12 h-12 bg-indigo-800 hover:bg-indigo-900 rounded-full bg-red-500 shadow-2xl focus:outline-none"
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
      onClick={onClick}
    >
      <FilterIcon className="w-6 h-6 m-auto text-white" />
      <div
        className={classnames(
          "absolute w-3 h-3 right-0 bottom-0 rounded-full bg-red-600",
          { hidden: !showDot }
        )}
      />
    </button>
  </div>
);

const HomePage: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters | undefined>();
  const [games, setGames] = useState<Game[]>([]);
  const [searchAfterKey, setSearchAfterKey] = useState<
    (string | number)[] | undefined
  >();
  const [moreResults, setMoreResults] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const loadGames = useCallback(
    async (
      filters: SearchFilters,
      searchAfter?: { games: Game[]; key: (string | number)[] }
    ) => {
      const showLoaderTimer = setTimeout(() => {
        if (!searchAfter) {
          setGames([]);
        }
      }, 1000);

      const results = await search(
        filters,
        searchAfter ? searchAfter.key : undefined
      );

      clearTimeout(showLoaderTimer);

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
        window.scrollTo(0, 0);
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

  // Prevent background content from scrolling when the sidebar is open.
  useEffect(() => {
    if (sidebarOpen) {
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "auto";
    }
  }, [sidebarOpen]);

  const hasActiveFilters = () => {
    const active = (
      filt?: string | string[],
      defaultValue: string | undefined = undefined
    ) => {
      return filt !== undefined && filt.length !== 0 && filt !== defaultValue;
    };
    if (!filters) {
      return false;
    }
    return (
      active(filters.sort, Filters.SortByRelevance) ||
      active(filters.rating, Filters.RatingAny) ||
      active(filters.age) ||
      active(filters.keywords) ||
      active(filters.players) ||
      active(filters.playtime) ||
      active(filters.weight)
    );
  };

  return (
    <>
      <Sidebar
        open={sidebarOpen}
        onSetOpen={setSidebarOpen}
        styles={{ sidebar: { position: "fixed", zIndex: "50" } }}
        sidebar={
          <div className="px-6 bg-gray-100 min-h-screen">
            <SearchFiltersMenu
              onChangeFilters={useCallback((filts) => setFilters(filts), [])}
            />
          </div>
        }
      >
        {/* This component requires a child. */}
        <div />
      </Sidebar>
      <div className="lg:container mx-auto my-4 px-4">
        <ShowFiltersButton
          onClick={() => setSidebarOpen(true)}
          showDot={hasActiveFilters()}
        />
        <div className="flex flex-row">
          <div className="sticky inset-0 self-start h-screen overflow-y-auto flex-grow-0 flex-shrink-0 w-48 md:w-56 pl-2 pr-4 mr-1 hidden sm:block">
            <SearchFiltersMenu
              onChangeFilters={useCallback((filts) => setFilters(filts), [])}
            />
          </div>
          <div className="flex-grow min-w-0">
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
                <div
                  key="loader"
                  className={classnames("flex items-center overflow-y-hidden", {
                    "mt-6": games.length === 0,
                  })}
                >
                  <div
                    className="h-16 w-16 mt-5 mb-2 mx-auto animate-spin ease-linear rounded-full border-4 border-t-4 border-gray-200"
                    style={{ borderTopColor: "#000" }}
                  ></div>
                </div>
              }
            >
              {games.length === 0 && !moreResults ? (
                <NoSearchResults />
              ) : (
                games.map((game) => <GameDisplay key={game.id} game={game} />)
              )}
            </InfiniteScroll>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;
