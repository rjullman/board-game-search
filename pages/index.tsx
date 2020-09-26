import React, { useEffect, useState, useRef } from "react";
import { Tooltip } from "react-tippy";
import classnames from "classnames";

import { search, Game } from "../lib/api";

const LabeledStat: React.FC<{
  stat: string | number;
  label: string;
  sublabel?: string;
}> = ({ stat, label, sublabel }) => (
  <div className="flex-grow flex-shrink">
    <div className="text-center">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-lg text-indigo-900 font-semibold tracking-wider">
        {stat}
      </div>
      {sublabel && <div className="text-sm text-gray-600">{sublabel}</div>}
    </div>
  </div>
);

const AccordianSection: React.FC<{
  title: string;
  tooltip?: string;
}> = ({ title, tooltip, children }) => {
  const [tagContainer, setTagContainer] = useState<HTMLElement | null>(null);
  const [scrollHeight, setScrollHeight] = useState<number>(0);
  const [overflows, setOverflows] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (tagContainer) {
      setScrollHeight(tagContainer.scrollHeight);
      setOverflows(tagContainer.scrollHeight > tagContainer.clientHeight);
    }
  }, [tagContainer]);

  const toggleAccordian = () => {
    if (overflows) {
      setExpanded(!expanded);
    }
  };

  const show = expanded || !overflows;

  return (
    <div className="py-2" onClick={toggleAccordian}>
      <div className="flex pb-1 items-center">
        <h3 className="text-lg font-bold">{title}</h3>
        {tooltip && <HelpTooltip>{tooltip}</HelpTooltip>}
      </div>
      <div
        ref={setTagContainer}
        className={classnames(
          "relative",
          "overflow-hidden",
          "transition-all ease-in-out duration-500"
        )}
        style={{ maxHeight: show ? `${scrollHeight + 25}px` : "5rem" }}
      >
        <div
          className={classnames(
            "absolute inset-0 w-100 h-100",
            "bg-gradient-to-b from-transparent to-white",
            "transition ease-in-out",
            show ? "opacity-0" : "opacity-100"
          )}
        ></div>
        {children}
      </div>
    </div>
  );
};

const TagList: React.FC<{
  title: string;
  tags: { id: number; name: string }[];
  tooltip?: string;
}> = ({ title, tags, tooltip }) => {
  if (tags.length === 0) {
    return <></>;
  }
  return (
    <AccordianSection title={title} tooltip={tooltip}>
      {tags.map((tag) => (
        <div
          key={tag.id}
          className={classnames(
            "inline-block py-1 px-3 mx-1 my-1",
            "rounded-full bg-indigo-900 text-xs text-white font-semibold"
          )}
        >
          {tag.name}
        </div>
      ))}
    </AccordianSection>
  );
};

const GameDisplay: React.FC<{ game: Game }> = ({ game }) => {
  const buyLink = `https://boardgamegeek.com/boardgame/${game.id}/${game.slug}#buyacopy`;
  return (
    <div
      key={game.id}
      className="bg-white rounded overflow-hidden shadow-lg my-3"
    >
      <div className="flex flex-row">
        <div className="flex-shrink-0">
          <div className="w-32 h-32 flex">
            {game.thumbnail ? (
              <img
                src={game.thumbnail}
                className="w-32 h-32 object-cover object-top rounded-br"
              />
            ) : (
              <svg
                className="w-24 h-24 m-auto text-indigo-800"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>
        </div>
        <div className="flex-grow p-2">
          <div className="flex px-3 py-1">
            <h2 className="flex-grow text-xl font-semibold truncate text-gray-800">
              {game.name} ({game.year_published})
            </h2>
            <div>
              <button
                className={classnames(
                  "flex-grow-0 flex-shrink-0",
                  "py-1 px-2",
                  "bg-indigo-800 hover:bg-indigo-900 text-white",
                  "rounded",
                  "text-sm font-bold"
                )}
              >
                <a className="inline-flex items-center" href={buyLink}>
                  <svg
                    className="fill-current w-3 h-3 mr-1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Buy a Copy</span>
                </a>
              </button>
            </div>
          </div>
          <div className="flex flex-row divide-x py-1">
            <LabeledStat
              label="rank"
              stat={game.rank}
              sublabel={`rated ${game.rating.toFixed(1)}/10`}
            />
            <LabeledStat
              label="players"
              stat={
                game.min_players != game.max_players
                  ? `${game.min_players}–${game.max_players}`
                  : game.min_players
              }
              sublabel={game.min_age != 0 ? `age ${game.min_age}+` : ""}
            />
            <LabeledStat
              label="playtime"
              stat={
                game.min_playtime != game.max_playtime
                  ? `${game.min_playtime}–${game.max_playtime}`
                  : game.min_playtime
              }
              sublabel="mins"
            />
            <LabeledStat
              label="weight"
              stat={game.weight == 0 ? "?" : `${game.weight.toFixed(1)}/5`}
              sublabel="complexity"
            />
          </div>
        </div>
      </div>
      <div className="px-5 pb-2 divide-y-4 divide-dashed">
        <AccordianSection title="Description">
          <div>
            {(game.description || "Missing game description.")
              .split("&#10;")
              .filter((elem) => elem.trim())
              .map((text, i, arr) => (
                <p
                  key={i}
                  className="py-1 first:pt-0 last:pb-0"
                  dangerouslySetInnerHTML={{ __html: text }}
                />
              ))}
          </div>
        </AccordianSection>
        <TagList
          title="Mechanics"
          tags={game.mechanics}
          tooltip="How you interact with the game. Games with similar mechanics will have similar rules, objectives, and challenges."
        />
        <TagList
          title="Themes"
          tags={game.categories}
          tooltip="How the game looks and feels. Games with similar themes may have a similar graphical style, form factor, or plot."
        />
        <TagList
          title="Expansions"
          tags={game.expansions}
          tooltip="Extensions to the game. This includes developer, fan, and promotional expansions some of which are no longer available for purchase."
        />
      </div>
    </div>
  );
};

const HelpTooltip: React.FC = ({ children }) => {
  return (
    <Tooltip
      html={<div className="w-32 text-xs">{children}</div>}
      position="right-start"
      arrow={true}
    >
      <div className="pl-1">
        <svg
          className="w-4 h-4 text-gray-800 hover:text-black"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </Tooltip>
  );
};

const FilterGroup: React.FC<{
  type: "checkbox" | "radio" | "select";
  label: string;
  options: string[];
  tooltip?: string;
}> = ({ type, label, options, tooltip }) => {
  const formClassname = () => {
    switch (type) {
      case "checkbox":
        return "form-checkbox";
      case "radio":
        return "form-radio";
      case "select":
        return "form-select";
      default:
        throw new Error(`Unknown filter group type "${type}".`);
    }
  };
  const form = () => {
    switch (type) {
      case "checkbox":
      // fallthrough
      case "radio":
        return options.map((option) => (
          <label key={option} className="flex items-center">
            <input type={type} className={formClassname()} name={label} />
            <span className="ml-2">{option}</span>
          </label>
        ));
      case "select":
        return (
          <select className="form-select block mt-1 text-sm">
            {options.map((option) => (
              <option>{option}</option>
            ))}
            ;
          </select>
        );
      default:
        throw new Error(`Unknown filter group type "${type}".`);
    }
  };
  return (
    <div className="flex flex-col mt-3">
      <div className="flex items-center text-base font-bold">
        {label} {tooltip && <HelpTooltip>{tooltip}</HelpTooltip>}
      </div>
      {form()}
    </div>
  );
};

const FilterIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      strokeWidth="2"
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
    />
  </svg>
);

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
    <>
      <div className="pt-6 pb-3">
        <input
          className="form-input mx-auto w-3/4 md:w-2/3 lg:w-1/2 min-w-full md:min-w-0 block shadow appearance-none text-gray-700"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex flex-row">
        <div className="flex-grow-0 flex-shrink-0 w-48 mr-4">
          <div className="sidebar pt-4 pb-2 w-100">
            <div className="flex flex-row items-center">
              <FilterIcon className="w-5 h-5 mr-2" />
              <div className="text-lg font-bold">Filters</div>
            </div>
            <FilterGroup
              type="select"
              label="Sort By"
              options={[
                "Relevance",
                "Rating (dec)",
                "Rating (inc)",
                "Weight (dec)",
                "Weight (inc)",
              ]}
            />
            <FilterGroup
              type="radio"
              label="Rating"
              options={["any", "2.0+", "5.0+", "8.0+"]}
              tooltip="BoardGameGeek user rating of game enjoyability and replayability."
            />
            <FilterGroup
              type="checkbox"
              label="Age"
              options={["0–4", "5–10", "11–17", "18–20", "21+"]}
            />
            <FilterGroup
              type="checkbox"
              label="Weight"
              options={["1.0–2.0", "2.0–3.0", "3.0-4.0", "4.0–5.0"]}
              tooltip='BoardGameGeek user rating of how difficult the game is to learn and play. Lower rating ("lighter") means easier.'
            />
            <FilterGroup
              type="checkbox"
              label="Playtime"
              options={["0–30 mins", "30–60 mins", "60–120 mins", "120+ mins"]}
            />
            <FilterGroup
              type="checkbox"
              label="Players"
              options={[
                "1 Player",
                "2 Player",
                "3 Player",
                "4 Player",
                "5+ Player",
              ]}
            />
          </div>
        </div>
        <div className="flex-grow">
          {games.map((game) => (
            <GameDisplay key={game.id} game={game} />
          ))}
        </div>
      </div>
    </>
  );
};

const HomePage: React.FC<{}> = () => (
  <div className="container mx-auto mb-6 px-6">
    <Combobox />
  </div>
);

export default HomePage;
