import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import InfiniteScroll from "react-infinite-scroller";
import classnames from "classnames";

import { RootState } from "../redux/store";
import { actions as filtersActions } from "../redux/filters";
import { actions as tagsActions } from "../redux/tags";
import { search, Game, SearchFilters } from "../lib/api";

import GameDisplay from "../components/GameDisplay";
import NoSearchResults from "../components/NoSearchResults";
import SearchFiltersMenu, {
  countActiveFilters,
} from "../components/SearchFiltersMenu";
import SiteInfoSidebar from "../components/SiteInfoSidebar";
import Sidebar from "../components/Sidebar";

import IconDice from "../images/dice.svg";
import IconFilter from "../images/icon-filter.svg";
import IconInfo from "../images/icon-info-circle.svg";

const Topbar: React.FC<{
  numActiveFilters: number;
  onClickFilter: () => void;
  onClickAbout: () => void;
}> = ({ numActiveFilters, onClickFilter, onClickAbout }) => {
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
                  "absolute px-1 rounded-full leading-snug font-bold bg-green-600",
                  { hidden: numActiveFilters === 0 }
                )}
                style={{
                  bottom: "1px",
                  right: "-3px",
                  fontSize: "9px",
                }}
              >
                {numActiveFilters}
              </div>
            </div>
          </IconButton>
          <a
            href="/"
            className="flex flex-row mx-auto sm:mx-0 min-w-0 items-center"
          >
            <IconDice className="w-10 h-10 ml-3 hidden sm:inline" />
            <span className="px-2 text-xl tracking-widest truncate">
              Board Game Search
            </span>
          </a>
          <IconButton onClick={onClickAbout}>
            <IconInfo className="w-8 h-8" />
          </IconButton>
        </div>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const filters = useSelector((state: RootState) =>
    state.filters.loaded ? state.filters.selected : undefined
  );
  const [games, setGames] = useState<Game[]>([]);
  const [searchAfterKey, setSearchAfterKey] = useState<
    (string | number)[] | undefined
  >();
  const [moreResults, setMoreResults] = useState<boolean>(true);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState<boolean>(false);
  const [aboutSidebarOpen, setAboutSidebarOpen] = useState<boolean>(false);

  const dispatch = useDispatch();

  // Initial load of tags from server.
  useEffect(() => {
    dispatch(tagsActions.fetchTags());
  }, [dispatch]);

  // Initial load of filters from query params.
  useEffect(() => {
    dispatch(filtersActions.loadFromQueryParams());
  }, [dispatch]);

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

  return (
    <>
      <Sidebar open={filterSidebarOpen} onSetOpen={setFilterSidebarOpen}>
        <div className="w-64 min-h-screen px-6 py-4 bg-gray-100">
          <SearchFiltersMenu instanceId="drawer" />
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
        numActiveFilters={filters ? countActiveFilters(filters) : 0}
        onClickFilter={() => setFilterSidebarOpen(!filterSidebarOpen)}
        onClickAbout={() => setAboutSidebarOpen(!aboutSidebarOpen)}
      />
      <div className="lg:container mx-auto px-3">
        <div className="flex flex-row">
          <div className="fixed h-screen w-56 md:w-64 pt-20 pb-4 hidden sm:block">
            <div className="h-full overflow-y-auto pl-2 pr-4">
              <SearchFiltersMenu instanceId="docked" />
            </div>
          </div>
          <div className="flex-grow min-w-0 mt-16 mb-4 ml-0 sm:ml-56 md:ml-64 px-1 pt-4">
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
