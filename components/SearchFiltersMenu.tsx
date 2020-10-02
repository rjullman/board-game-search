import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  useQueryParams,
  withDefault,
  StringParam,
  DelimitedArrayParam,
} from "use-query-params";

import { Filters, SearchFilters } from "../lib/api";

import FilterIcon from "./FilterIcon";
import HelpTooltip from "./HelpTooltip";

const FilterGroup: React.FC<{
  type: "checkbox" | "radio" | "select";
  label: string;
  options: string[];
  values?: string[];
  selected?: string[];
  tooltip?: string;
  onChange?: (vals: string[]) => void;
}> = ({ type, label, options, values, selected = [], tooltip, onChange }) => {
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
          <label key={option} className="flex items-center">
            <input
              type={type}
              className={formClassname()}
              name={`${uid}-${label}`}
              value={getValue(i)}
              checked={selected.includes(getValue(i))}
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
              <option key={option} value={getValue(i)}>
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
    <div className="flex flex-col mt-3">
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
  const [query, setQuery] = useQueryParams({
    keywords: withDefault(StringParam, ""),
    sort: withDefault(StringParam, Filters.SortByRelevance),
    rank: withDefault(StringParam, Filters.RankAny),
    rating: withDefault(StringParam, Filters.RatingAny),
    ratingCount: withDefault(StringParam, Filters.RatingCountAny),
    weight: withDefault(DelimitedArrayParam, []),
    age: withDefault(DelimitedArrayParam, []),
    playtime: withDefault(DelimitedArrayParam, []),
    players: withDefault(DelimitedArrayParam, []),
  });
  const searchInput = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/exhaustive-deps */
  // Create memoized versions of array fields from useQueryParams
  // to enforce reference equality. In particular, this prevents
  // firing onChangeFilters unecessarily on every render.
  const removeNulls = (arr: (string | null)[]): string[] => {
    return arr
      .filter((item) => item !== null)
      .map((item) => (item ? item : ""));
  };
  const weight = useMemo(() => removeNulls(query.weight), [
    JSON.stringify(query.weight),
  ]);
  const age = useMemo(() => removeNulls(query.age), [
    JSON.stringify(query.age),
  ]);
  const playtime = useMemo(() => removeNulls(query.playtime), [
    JSON.stringify(query.playtime),
  ]);
  const players = useMemo(() => removeNulls(query.players), [
    JSON.stringify(query.players),
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (onChangeFilters) {
      onChangeFilters({
        keywords: query.keywords,
        sort: query.sort,
        rank: query.rank,
        rating: query.rating,
        ratingCount: query.ratingCount,
        weight,
        age,
        playtime,
        players,
      });
    }
  }, [
    query.keywords,
    query.sort,
    query.rank,
    query.rating,
    query.ratingCount,
    weight,
    age,
    playtime,
    players,
    onChangeFilters,
  ]);

  useEffect(() => {
    if (searchInput.current) {
      searchInput.current.value = query.keywords;
    }
  }, [searchInput, query.keywords]);

  return (
    <div className="py-4 w-100">
      <div className="flex flex-row items-center">
        <FilterIcon className="w-5 h-5 mr-2" />
        <div className="text-lg font-bold">Filters</div>
      </div>
      <div className="flex flex-col mt-3">
        <div className="flex items-center text-base font-bold">Keywords</div>
        <input
          ref={searchInput}
          className="form-input mt-1 text-sm"
          placeholder="Search..."
          onChange={(e) => setQuery({ keywords: e.target.value })}
        />
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
        values={[
          Filters.SortByRelevance,
          Filters.SortByRatingDec,
          Filters.SortByRatingInc,
          Filters.SortByWeightDec,
          Filters.SortByWeightInc,
        ]}
        selected={[query.sort]}
        onChange={(vals) => setQuery({ sort: vals[0] })}
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
        onChange={(vals) => setQuery({ players: vals })}
      />
      <FilterGroup
        type="checkbox"
        label="Weight"
        options={[
          Filters.Weight1to2,
          Filters.Weight2to3,
          Filters.Weight3to4,
          Filters.Weight4to5,
        ]}
        tooltip='BoardGameGeek user rating of how difficult the game is to learn and play. Lower rating ("lighter") means easier.'
        selected={weight}
        onChange={(vals) => setQuery({ weight: vals })}
      />
      <FilterGroup
        type="checkbox"
        label="Age"
        options={[
          Filters.Age0To4,
          Filters.Age5To10,
          Filters.Age11To17,
          Filters.Age18To20,
          Filters.Age21Plus,
        ]}
        selected={age}
        onChange={(vals) => setQuery({ age: vals })}
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
        onChange={(vals) => setQuery({ playtime: vals })}
      />
      <FilterGroup
        type="radio"
        label="Rank"
        options={[
          Filters.RankAny,
          Filters.RankTop2500,
          Filters.RankTop500,
          Filters.RankTop100,
        ]}
        tooltip="BoardGameGeek ranking of overall game popularity (e.g. rating, number of reviews, discussion online)."
        selected={[query.rank]}
        onChange={(vals) => setQuery({ rank: vals[0] })}
      />
      <FilterGroup
        type="radio"
        label="Rating"
        options={[
          Filters.RatingAny,
          Filters.Rating2Plus,
          Filters.Rating5Plus,
          Filters.Rating8Plus,
        ]}
        tooltip="BoardGameGeek user rating of game enjoyability and replayability. Highly rated games are not always highly ranked."
        selected={[query.rating]}
        onChange={(vals) => setQuery({ rating: vals[0] })}
      />
      <FilterGroup
        type="radio"
        label="Rating Count"
        options={[
          Filters.RatingCountAny,
          Filters.RatingCount100Plus,
          Filters.RatingCount1000Plus,
          Filters.RatingCount10000Plus,
        ]}
        tooltip="Number of BoardGameGeek user ratings."
        selected={[query.ratingCount]}
        onChange={(vals) => setQuery({ ratingCount: vals[0] })}
      />
    </div>
  );
};

export default SearchFiltersMenu;
