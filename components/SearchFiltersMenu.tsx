import React, { useState, useEffect } from "react";
import {
  useQueryParam,
  BooleanParam,
  StringParam,
  DelimitedArrayParam,
} from "use-query-params";
import classnames from "classnames";

import { Filters, SearchFilters } from "../lib/api";

import HelpTooltip from "./HelpTooltip";

import IconFilter from "../images/icon-filter.svg";

/**
 *  Wrapper hooks for using useQueryParams.
 *
 *  These wrappers improve upon withDefault (provided by the "use-query-params"
 *  package) with better type safety and patterns for SSR.
 **/

const useStringQueryParam = (
  key: string,
  fallback: string
): [
  string,
  React.Dispatch<React.SetStateAction<string | null | undefined>>
] => {
  const [param, setParam] = useQueryParam(key, StringParam);
  const [state, setState] = useState<string>(fallback);
  useEffect(() => {
    setState(param ? param : fallback);
  }, [param, fallback]);
  return [state, setParam];
};

const useBooleanQueryParam = (
  key: string,
  fallback: boolean
): [
  boolean,
  React.Dispatch<React.SetStateAction<boolean | null | undefined>>
] => {
  const [param, setParam] = useQueryParam(key, BooleanParam);
  const [state, setState] = useState<boolean>(fallback);
  useEffect(() => {
    setState(param ? param : fallback);
  }, [param, fallback]);
  return [state, setParam];
};

const useArrayQueryParam = (
  key: string
): [
  string[],
  React.Dispatch<React.SetStateAction<(string | null)[] | null | undefined>>
] => {
  const [param, setParam] = useQueryParam(key, DelimitedArrayParam);
  const [state, setState] = useState<string[]>([]);
  useEffect(() => {
    setState(
      param
        ? param
            .filter((item) => item !== null)
            .map((item) => (item ? item : ""))
        : []
    );
  }, [param]);
  return [state, setParam];
};

const FilterGroup: React.FC<{
  type: "checkbox" | "radio" | "select";
  label?: string;
  options: string[];
  values?: string[];
  selected?: string[];
  disabled?: boolean;
  tooltip?: string;
  onChange?: (vals: string[]) => void;
  className?: string;
}> = ({
  type,
  label = "",
  options,
  values,
  selected = [],
  disabled = false,
  tooltip,
  onChange,
  className = "mt-3",
}) => {
  // Prefix forms groups with a UUID to allow multiple groups with the same
  // "label" on a page. This can be useful if you need to render multiple copies
  // of the same filter group depending on screen size.
  const [uid, setUid] = useState<string>("");
  useEffect(() => {
    setUid(Math.random().toString(36).substring(2, 15));
  }, []);

  // Validate inputs to provide developer feedback.
  useEffect(() => {
    if (values && values.length != options.length) {
      throw new Error("There must be the same number of options and values.");
    }
    if (type === "radio" || type === "select") {
      if (selected.length === 0) {
        throw new Error(
          `Inputs of type '${type}' must have at least one selected value.`
        );
      }
    }
  }, [values, options, selected, type]);

  const changeOption = (value: string) => {
    if (!onChange) {
      return;
    }
    switch (type) {
      case "checkbox":
        const allowedSelected = selected.filter((sel) =>
          (values || options).includes(sel)
        );
        if (allowedSelected.includes(value)) {
          return onChange(allowedSelected.filter((q) => q != value));
        }
        return onChange([...allowedSelected, value]);
      case "radio":
      // fallthrough
      case "select":
        return onChange([value]);
      default:
        throw new Error(`Unknown filter group type "${type}".`);
    }
  };

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

  const getValue = (index: number) => (values ? values[index] : options[index]);

  const form = () => {
    switch (type) {
      case "checkbox":
      // fallthrough
      case "radio":
        return options.map((option, i) => (
          <label
            key={option}
            className={classnames("flex items-center", {
              "opacity-50": disabled,
            })}
          >
            <input
              type={type}
              className={formClassname()}
              name={`${uid}-${label}`}
              value={getValue(i)}
              checked={selected.includes(getValue(i))}
              disabled={disabled}
              onChange={(e) => changeOption(e.target.value)}
            />
            <span className="ml-2">{option}</span>
          </label>
        ));
      case "select":
        return (
          <select
            className="form-select block mt-1 text-sm"
            onChange={(e) => changeOption(e.target.value)}
            value={selected.length === 0 ? getValue(0) : selected[0]}
          >
            {options.map((option, i) => (
              <option key={option} value={getValue(i)} disabled={disabled}>
                {option}
              </option>
            ))}
            ;
          </select>
        );
      default:
        throw new Error(`Unknown filter group type "${type}".`);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center text-base font-bold">
        {label} {tooltip && <HelpTooltip>{tooltip}</HelpTooltip>}
      </div>
      {form()}
    </div>
  );
};

const SearchFiltersMenu: React.FC<{
  onChangeFilters?: (filts: SearchFilters) => void;
}> = ({ onChangeFilters }) => {
  const [keywords, setKeywords] = useStringQueryParam("keywords", "");
  const [sort, setSort] = useStringQueryParam("sort", Filters.SortByRelevance);
  const [reverse, setReverse] = useBooleanQueryParam("reverse", false);
  const [rank, setRank] = useStringQueryParam("rank", Filters.RankAny);
  const [rating, setRating] = useStringQueryParam("rating", Filters.RatingAny);
  const [ratingCount, setRatingCount] = useStringQueryParam(
    "ratingCount",
    Filters.RatingCountAny
  );
  const [weight, setWeight] = useArrayQueryParam("weight");
  const [age, setAge] = useArrayQueryParam("age");
  const [playtime, setPlaytime] = useArrayQueryParam("playtime");
  const [players, setPlayers] = useArrayQueryParam("players");

  // Track if the initial render is complete in order to avoid calling
  // onChangeFilters twice during the initial load.
  const [init, setInit] = useState<boolean>(false);
  useEffect(() => {
    if (!init) {
      setInit(true);
    }
  }, [init]);

  useEffect(() => {
    if (onChangeFilters && init) {
      onChangeFilters({
        keywords,
        sort,
        reverse,
        rank,
        rating,
        ratingCount,
        weight,
        age,
        playtime,
        players,
      });
    }
  }, [
    keywords,
    sort,
    reverse,
    rank,
    rating,
    ratingCount,
    weight,
    age,
    playtime,
    players,
    init,
    onChangeFilters,
  ]);

  return (
    <div className="w-100">
      <div className="flex flex-row items-center">
        <IconFilter className="w-5 h-5 mr-2" />
        <div className="text-lg font-bold">Filters</div>
      </div>
      <div className="flex flex-col mt-3">
        <div className="flex items-center text-base font-bold">Keywords</div>
        <input
          value={keywords}
          className="form-input mt-1 text-sm"
          placeholder="Search..."
          onChange={(e) => setKeywords(e.target.value)}
        />
      </div>
      <FilterGroup
        type="select"
        label="Sort By"
        options={["Relevance", "Rank", "Rating", "Weight"]}
        values={[
          Filters.SortByRelevance,
          Filters.SortByRank,
          Filters.SortByRating,
          Filters.SortByWeight,
        ]}
        selected={[sort]}
        onChange={(vals) => setSort(vals.length ? vals[0] : undefined)}
      />
      <FilterGroup
        type="checkbox"
        options={["Reverse Order"]}
        values={["true"]}
        selected={[reverse ? "true" : "false"]}
        disabled={sort === Filters.SortByRelevance}
        onChange={(vals) =>
          setReverse(vals.length ? vals[0] === "true" : undefined)
        }
        className="mt-2 text-sm"
      />
      <FilterGroup
        type="checkbox"
        label="Players"
        options={["1 Player", "2 Player", "3 Player", "4 Player", "5+ Player"]}
        values={[
          Filters.Players1,
          Filters.Players2,
          Filters.Players3,
          Filters.Players4,
          Filters.Players5Plus,
        ]}
        selected={players}
        onChange={setPlayers}
      />
      <FilterGroup
        type="checkbox"
        label="Weight"
        options={["1.0–2.0", "2.0–3.0", "3.0–4.0", "4.0–5.0"]}
        values={[
          Filters.Weight1to2,
          Filters.Weight2to3,
          Filters.Weight3to4,
          Filters.Weight4to5,
        ]}
        tooltip='BoardGameGeek user rating of how difficult the game is to learn and play. Lower rating ("lighter") means easier.'
        selected={weight}
        onChange={setWeight}
      />
      <FilterGroup
        type="checkbox"
        label="Age"
        options={["0–4", "5–10", "11–17", "18–20", "21+"]}
        values={[
          Filters.Age0To4,
          Filters.Age5To10,
          Filters.Age11To17,
          Filters.Age18To20,
          Filters.Age21Plus,
        ]}
        selected={age}
        onChange={setAge}
      />
      <FilterGroup
        type="checkbox"
        label="Playtime"
        options={["0–30 mins", "30–60 mins", "60–120 mins", "120+ mins"]}
        values={[
          Filters.Playtime0to30,
          Filters.Playtime30to60,
          Filters.Playtime60to120,
          Filters.Playtime120Plus,
        ]}
        selected={playtime}
        onChange={setPlaytime}
      />
      <FilterGroup
        type="radio"
        label="Rank"
        options={["any", "top 2500", "top 500", "top 100"]}
        values={[
          Filters.RankAny,
          Filters.RankTop2500,
          Filters.RankTop500,
          Filters.RankTop100,
        ]}
        tooltip="BoardGameGeek ranking of overall game popularity (e.g. rating, number of reviews, discussion online)."
        selected={[rank]}
        onChange={(vals) => setRank(vals.length ? vals[0] : undefined)}
      />
      <FilterGroup
        type="radio"
        label="Rating"
        options={["any", "2+", "5+", "8+"]}
        values={[
          Filters.RatingAny,
          Filters.Rating2Plus,
          Filters.Rating5Plus,
          Filters.Rating8Plus,
        ]}
        tooltip="BoardGameGeek user rating of game enjoyability and replayability. Highly rated games are not always highly ranked."
        selected={[rating]}
        onChange={(vals) => setRating(vals.length ? vals[0] : undefined)}
      />
      <FilterGroup
        type="radio"
        label="Rating Count"
        options={["any", "100+", "1k+", "10k+"]}
        values={[
          Filters.RatingCountAny,
          Filters.RatingCount100Plus,
          Filters.RatingCount1000Plus,
          Filters.RatingCount10000Plus,
        ]}
        tooltip="Number of BoardGameGeek user ratings."
        selected={[ratingCount]}
        onChange={(vals) => setRatingCount(vals.length ? vals[0] : undefined)}
      />
    </div>
  );
};

export default SearchFiltersMenu;
