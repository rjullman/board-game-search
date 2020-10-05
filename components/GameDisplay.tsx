import React, { useEffect, useState } from "react";
import classnames from "classnames";

import { Game } from "../lib/api";

import HelpTooltip from "./HelpTooltip";

import IconPhoto from "../images/icon-photo.svg";
import IconShoppingBag from "../images/icon-shopping-bag.svg";

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
    <div className="py-2 first:pt-0" onClick={toggleAccordian}>
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
        />
        {children}
      </div>
    </div>
  );
};

const LabeledStat: React.FC<{
  stat: string | number;
  label: string;
  sublabel?: React.ReactElement | string;
}> = ({ stat, label, sublabel }) => (
  <div className="flex-grow flex-shrink w-1/2 py-2 md:w-1/4 md:py-0">
    <div className="text-center">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-lg text-indigo-900 font-semibold tracking-wider">
        {stat}
      </div>
      {sublabel && <div className="text-sm text-gray-600">{sublabel}</div>}
    </div>
  </div>
);

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
  const approxInThousands = (num: number): string => {
    if (num > 10000) {
      return `${(num / 1000).toFixed(0)}k`;
    } else if (num > 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };
  const buyLink = `https://boardgamegeek.com/boardgame/${game.id}/${game.slug}#buyacopy`;
  return (
    <div
      key={game.id}
      className="bg-white rounded overflow-hidden shadow-lg my-3 first:mt-0"
    >
      <div className="flex flex-col md:flex-row">
        <div className="flex-shrink-0">
          <div className="flex w-full h-24 md:w-32 md:h-32">
            {game.thumbnail ? (
              <img
                src={game.thumbnail}
                className="w-full object-cover object-center md:rounded-br"
              />
            ) : (
              <IconPhoto className="w-24 h-24 m-auto text-indigo-800" />
            )}
          </div>
        </div>
        <div className="flex-grow p-2 pb-0 min-w-0">
          <div className="flex py-1 px-1 sm:px-3 justify-between">
            <div className="flow-grow flex-shrink pr-2 text-xl font-semibold truncate text-gray-800">
              {game.name} ({game.year_published})
            </div>
            <div className="flex-grow-0 flex-shrink-0">
              <button
                className={classnames(
                  "py-1 px-2",
                  "bg-indigo-800 hover:bg-indigo-900 text-white",
                  "rounded",
                  "text-sm font-bold"
                )}
              >
                <a className="inline-flex items-center min-w-0" href={buyLink}>
                  <IconShoppingBag className="fill-current w-3 h-3 mr-1" />
                  <div>
                    Buy <span className="hidden sm:inline">a Copy</span>
                  </div>
                </a>
              </button>
            </div>
          </div>
          <div className="flex flex-row flex-wrap md:flex-no-wrap md:divide-x-1 md:py-2">
            <LabeledStat
              label="rank"
              stat={game.rank}
              sublabel={
                <>
                  {game.rating.toFixed(1)}/10 (
                  {approxInThousands(game.num_ratings)}
                  <span className="inline md:hidden lg:inline"> ratings</span>)
                </>
              }
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
              stat={game.weight ? `${game.weight.toFixed(1)}/5` : "?"}
              sublabel="complexity"
            />
          </div>
        </div>
      </div>
      <div className="px-3 sm:px-5 pb-2 pt-1 md:pt-2 divide-y-4 divide-dashed">
        <AccordianSection title="Description">
          {game.brief_description && (
            <div className="border-gray-200 border-l-8 mb-1 font-light px-6 py-3 text-base">
              {game.brief_description}
            </div>
          )}
          <div>
            {(game.description || "Missing game description.")
              .split("&#10;")
              .filter((elem) => elem.trim())
              .map((text, i) => (
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

export default GameDisplay;
