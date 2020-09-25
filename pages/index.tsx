import React, { useEffect, useState } from "react";
import { Tooltip } from "react-tippy";

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

const GameDisplay: React.FC<{ game: Game }> = ({ game }) => {
  return (
    <div
      key={game.id}
      className="flex flex-row bg-white rounded overflow-hidden shadow-lg my-3"
    >
      <div className="flex-shrink-0">
        <img
          src={game.thumbnail}
          className="w-32 h-32 object-cover object-top"
        />
      </div>
      <div className="flex-grow p-2">
        <div className="px-3">
          <h2 className="text-xl font-semibold truncate text-gray-800">
            {game.name} ({game.year_published})
          </h2>
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

const CheckboxGroup: React.FC<{
  label: string;
  options: string[];
  tooltip?: string;
}> = ({ label, options, tooltip }) => {
  return (
    <div className="flex flex-col mt-3">
      <div className="flex items-center text-base font-bold">
        {label} {tooltip && <HelpTooltip>{tooltip}</HelpTooltip>}
      </div>
      {options.map((option) => (
        <label className="flex items-center">
          <input type="checkbox" className="form-checkbox" />
          <span className="ml-2">{option}</span>
        </label>
      ))}
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
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
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
        <div className="flex-grow-0 w-48 mx-3">
          <div className="sidebar pt-4 pb-2 w-100">
            <div className="flex flex-row items-center">
              <FilterIcon className="w-5 h-5 mr-2" />
              <div className="text-lg font-bold">Filters</div>
            </div>
            <CheckboxGroup
              label="Age"
              options={["0–4", "5–10", "11–17", "18–20", "21+"]}
            />
            <CheckboxGroup
              label="Weight"
              options={["1.0–2.0", "2.0–3.0", "3.0-4.0", "4.0–5.0"]}
              tooltip='BoardGameGeek user rating of how difficult the game is to learn and play. Lower rating ("lighter") means easier.'
            />
            <CheckboxGroup
              label="Playtime"
              options={["0–30 mins", "30–60 mins", "60–120 mins", "120+ mins"]}
            />
            <CheckboxGroup
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
            <GameDisplay game={game} />
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
