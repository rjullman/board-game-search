import React, { useEffect, useState, useCallback } from "react";
import InfiniteScroll from "react-infinite-scroller";
import classnames from "classnames";

import { search, Game, SearchFilters, Filters } from "../lib/api";

import GameDisplay from "../components/GameDisplay";
import NoSearchResults from "../components/NoSearchResults";
import SearchFiltersMenu from "../components/SearchFiltersMenu";
import SiteInfoSidebar from "../components/SiteInfoSidebar";
import Sidebar from "../components/Sidebar";

import IconCollection from "../images/icon-collection.svg";
import IconFilter from "../images/icon-filter.svg";

const InfoIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const Topbar: React.FC<{
  activeFilters: boolean;
  onClickFilter: () => void;
  onClickAbout: () => void;
}> = ({ activeFilters, onClickFilter, onClickAbout }) => {
  const IconButton: React.FC<{ className?: string; onClick: () => void }> = ({
    className = "",
    onClick,
    children,
  }) => (
    <button
      className={classnames(
        "form-button h-full px-3 hover:text-gray-300 focus:outline-none",
        className
      )}
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
  return (
    <div className="fixed inset-0 h-16 w-full z-30 bg-indigo-900">
      <div className="lg:container mx-auto h-full">
        <div className="flex flex-row justify-between h-full mx-auto text-white">
          <IconButton className="sm:hidden" onClick={onClickFilter}>
            <div className="relative">
              <IconFilter className="w-8 h-8" />
              <div
                className={classnames(
                  "absolute w-2 h-2 right-0 bottom-0 rounded-full bg-red-600 animate-pulse",
                  { hidden: !activeFilters }
                )}
              />
            </div>
          </IconButton>
          <a
            href="/"
            className="flex flex-row mx-auto sm:mx-0 min-w-0 items-center"
          >
            <IconCollection className="w-8 h-8 ml-3 hidden sm:inline" />
            <span className="px-2 text-xl font-mono truncate">
              Board Game Search
            </span>
          </a>
          <IconButton onClick={onClickAbout}>
            <InfoIcon className="w-8 h-8" />
          </IconButton>
        </div>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters | undefined>();
  const [games, setGames] = useState<Game[]>([]);
  const [searchAfterKey, setSearchAfterKey] = useState<
    (string | number)[] | undefined
  >();
  const [moreResults, setMoreResults] = useState<boolean>(true);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState<boolean>(false);
  const [aboutSidebarOpen, setAboutSidebarOpen] = useState<boolean>(false);

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
    if (filterSidebarOpen || aboutSidebarOpen) {
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "auto";
    }
  }, [filterSidebarOpen, aboutSidebarOpen]);

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
      active(filters.ratingCount, Filters.RatingCountAny) ||
      active(filters.rank, Filters.RankAny) ||
      active(filters.age) ||
      active(filters.keywords) ||
      active(filters.players) ||
      active(filters.playtime) ||
      active(filters.weight)
    );
  };

  return (
    <>
      <Sidebar open={filterSidebarOpen} onSetOpen={setFilterSidebarOpen}>
        <div className="px-6 py-4 bg-gray-100 min-h-screen">
          <SearchFiltersMenu
            onChangeFilters={useCallback((filts) => setFilters(filts), [])}
          />
        </div>
      </Sidebar>
      <Sidebar
        open={aboutSidebarOpen}
        onSetOpen={setAboutSidebarOpen}
        pullRight={true}
      >
        <SiteInfoSidebar />
      </Sidebar>
      <Topbar
        activeFilters={hasActiveFilters()}
        onClickFilter={() => setFilterSidebarOpen(!filterSidebarOpen)}
        onClickAbout={() => setAboutSidebarOpen(!aboutSidebarOpen)}
      />
      <div className="lg:container mx-auto px-3">
        <div className="flex flex-row">
          <div className="fixed h-screen w-48 md:w-56 pt-20 pb-4 hidden sm:block">
            <div className="h-full overflow-y-auto pl-2 pr-4">
              <SearchFiltersMenu
                onChangeFilters={useCallback((filts) => setFilters(filts), [])}
              />
            </div>
          </div>
          <div className="flex-grow min-w-0 mt-16 mb-4 ml-0 sm:ml-48 md:ml-56 px-1 pt-4">
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
                    className="h-16 w-16 mt-5 mb-2 mx-auto animate-spin ease-linear rounded-full border-4 border-gray-200"
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
