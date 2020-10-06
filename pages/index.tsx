import React, { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import InfiniteScroll from "react-infinite-scroller";
import classnames from "classnames";

import { search, Game, SearchFilters } from "../lib/api";

import GameDisplay from "../components/GameDisplay";
import NoSearchResults from "../components/NoSearchResults";
import SearchFiltersMenu from "../components/SearchFiltersMenu";
import SiteInfoSidebar from "../components/SiteInfoSidebar";
import Sidebar from "../components/Sidebar";

import IconDice from "../images/dice.svg";
import IconFilter from "../images/icon-filter.svg";
import IconInfo from "../images/icon-info-circle.svg";

const HeadMetadata: React.FC = () => {
  if (!process.env.NEXT_PUBLIC_CANONICAL_URL) {
    throw new Error(
      "NEXT_PUBLIC_CANONICAL_URL environment variable must be defined."
    );
  }
  const url = process.env.NEXT_PUBLIC_CANONICAL_URL.replace(/\/+$/, "");
  return (
    <Head>
      <title>Board Game Search</title>
      <meta charSet="utf-8" />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      <meta name="robots" content="index, follow" />
      <meta
        name="description"
        content="Easily search for and discover your next favorite board game! Our board game database is updated daily with the top 10,000 games."
      />

      <meta property="og:type" content="website" />
      <meta property="og:title" content="Board Game Search" />
      <meta
        property="og:description"
        content="Easily search for and discover your next favorite board game!"
      />
      <meta property="og:image" content={`${url}/logo.jpg`} />
      <meta property="og:url" content={url} />

      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#3c366b" />
      <meta name="apple-mobile-web-app-title" content="Board Game Search" />
      <meta name="application-name" content="Board Game Search" />
      <meta name="msapplication-TileColor" content="#9f00a7" />
      <meta name="theme-color" content="#3c366b" />
    </Head>
  );
};

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
            <span className="px-2 text-xl font-mono truncate">
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
  const [filters, setFilters] = useState<SearchFilters | undefined>();
  const [numActiveFilters, setNumActiveFilters] = useState<number>(0);
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

  const onChangeFilters = useCallback((filts, active) => {
    setFilters(filts);
    setNumActiveFilters(active);
  }, []);

  return (
    <>
      <HeadMetadata />
      <Sidebar open={filterSidebarOpen} onSetOpen={setFilterSidebarOpen}>
        <div className="px-6 py-4 bg-gray-100 min-h-screen">
          <SearchFiltersMenu onChangeFilters={onChangeFilters} />
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
        numActiveFilters={numActiveFilters}
        onClickFilter={() => setFilterSidebarOpen(!filterSidebarOpen)}
        onClickAbout={() => setAboutSidebarOpen(!aboutSidebarOpen)}
      />
      <div className="lg:container mx-auto px-3">
        <div className="flex flex-row">
          <div className="fixed h-screen w-48 md:w-56 pt-20 pb-4 hidden sm:block">
            <div className="h-full overflow-y-auto pl-2 pr-4">
              <SearchFiltersMenu onChangeFilters={onChangeFilters} />
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
