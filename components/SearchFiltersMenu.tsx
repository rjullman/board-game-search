import React, { useState, useEffect, useCallback } from "react";
import {
  useQueryParams,
  BooleanParam,
  StringParam,
  DelimitedArrayParam,
} from "use-query-params";
import classnames from "classnames";

import { Filters, SearchFilters } from "../lib/api";

import HelpTooltip from "./HelpTooltip";

import IconFilter from "../images/icon-filter.svg";

/**
 *  Default search filters
 *
 *  Always set array keys to be empty arrays. If you want a default selected
 *  array, the logic in useFiltersQueryParams will have to update first to do
 *  deep array equality comparison.
 **/
const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  keywords: "",
  sort: Filters.SortByRelevance,
  reverse: false,
  rank: Filters.RankAny,
  rating: Filters.RatingAny,
  ratingCount: Filters.RatingCountAny,
  weight: [],
  age: [],
  playtime: [],
  players: [],
};

/**
 *  Wrapper hook for using useQueryParams.
 *
 *  This wrapper improves upon withDefault (provided by the "use-query-params"
 *  package) with better type safety and patterns for SSR.
 **/
const useFiltersQueryParams = (
  fallbacks: SearchFilters
): [SearchFilters, (filters?: SearchFilters) => void] => {
  const [params, setParams] = useQueryParams({
    keywords: StringParam,
    sort: StringParam,
    reverse: BooleanParam,
    rank: StringParam,
    rating: StringParam,
    ratingCount: StringParam,
    weight: DelimitedArrayParam,
    age: DelimitedArrayParam,
    playtime: DelimitedArrayParam,
    players: DelimitedArrayParam,
  });
  const [state, setState] = useState<SearchFilters>(fallbacks);
  const removeNulls = (arr: (string | null)[] | null | undefined) => {
    if (!arr) {
      return undefined;
    }
    return arr
      .filter((item) => item !== null)
      .map((item) => (item ? item : ""));
  };
  useEffect(
    () => {
      setState({
        keywords: params.keywords || fallbacks.keywords,
        sort: params.sort || fallbacks.sort,
        reverse: params.reverse || fallbacks.reverse,
        rank: params.rank || fallbacks.rank,
        rating: params.rating || fallbacks.rating,
        ratingCount: params.ratingCount || fallbacks.ratingCount,
        weight: removeNulls(params.weight) || fallbacks.weight,
        age: removeNulls(params.age) || fallbacks.age,
        playtime: removeNulls(params.playtime) || fallbacks.playtime,
        players: removeNulls(params.players) || fallbacks.players,
      });
    },
    /* eslint-disable react-hooks/exhaustive-deps */
    // Compare arrays with deep equality. Calling setState when values have not
    // changed will cause the onChangeFilters callback to trigger spuriously,
    // which may cause downstream code to update the filters menu (causing an
    // infinite loop).
    [JSON.stringify(params), JSON.stringify(fallbacks)]
    /* eslint-enable react-hooks/exhaustive-deps */
  );

  const setParamsWrapper = useCallback(
    (filters?: SearchFilters) => {
      if (!filters) {
        return setParams({}, "replace");
      }

      // Create a set of filters that useQueryParams accepts. We remove filters
      // that are the default value so that they are removed from the query
      // params instead of just being unset (e.g. "?players=").
      const newFilters = Object.fromEntries(
        Object.entries(filters)
          .map(([key, value]) => {
            if (key in fallbacks) {
              const keyCast = key as keyof SearchFilters;
              if (Array.isArray(value)) {
                if (value.length === 0) {
                  return [key, undefined];
                }
              } else if (fallbacks[keyCast] === value) {
                return [key, undefined];
              }
            }
            return [key, value];
          })
          .filter(([key, value]) => key !== undefined && value !== undefined)
      );
      setParams(newFilters, "replace");
    },
    [fallbacks, setParams]
  );

  return [state, setParamsWrapper];
};

const countActiveFilters = (filters: SearchFilters) => {
  const active = (
    filt?: string | string[],
    defaultValue: string | undefined = undefined
  ): number => {
    return filt && filt.length && filt !== defaultValue ? 1 : 0;
  };
  if (!filters) {
    return 0;
  }
  return (
    active(filters.sort, Filters.SortByRelevance) +
    active(filters.rating, Filters.RatingAny) +
    active(filters.ratingCount, Filters.RatingCountAny) +
    active(filters.rank, Filters.RankAny) +
    active(filters.age) +
    active(filters.keywords) +
    active(filters.players) +
    active(filters.playtime) +
    active(filters.weight)
  );
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
      if (!selected.length) {
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
            value={selected.length ? selected[0] : getValue(0)}
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
  onChangeFilters?: (filts: SearchFilters, numActive: number) => void;
}> = ({ onChangeFilters }) => {
  const [filters, setFilters] = useFiltersQueryParams(DEFAULT_SEARCH_FILTERS);

  // Track if the initial render is complete in order to avoid calling
  // onChangeFilters twice during the initial load.
  const [init, setInit] = useState<boolean>(false);
  useEffect(() => {
    if (!init) {
      setInit(true);
    }
  }, [init]);

  // Batch changes to the filters.keywords field in the keywords state.  This
  // makes inputs more responsive since your prevent many additional costly
  // onChangeFilters events (which cause API requests).
  const [keywords, setKeywords] = useState<string>("");
  useEffect(() => {
    const timerId = setTimeout(() => {
      setFilters({ ...filters, keywords });
    }, 250);
    return () => clearTimeout(timerId);
  }, [keywords, filters, setFilters]);

  useEffect(() => {
    setKeywords(filters.keywords);
  }, [filters.keywords]);

  useEffect(() => {
    if (onChangeFilters && init) {
      onChangeFilters(filters, countActiveFilters(filters));
    }
  }, [filters, init, onChangeFilters]);

  return (
    <div className="w-100">
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center">
          <IconFilter className="w-5 h-5 mr-2" />
          <div className="text-lg font-bold">Filters</div>
        </div>
        <button
          className="pt-1 text-xs underline hover:opacity-75 focus:outline-none"
          onClick={() => setFilters(undefined)}
        >
          Clear all ({countActiveFilters(filters)})
        </button>
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
        selected={[filters.sort]}
        onChange={([sort]) => {
          setFilters({ ...filters, sort });
        }}
      />
      <FilterGroup
        type="checkbox"
        options={["Reverse Order"]}
        values={["true"]}
        selected={[filters.reverse ? "true" : "false"]}
        disabled={filters.sort === Filters.SortByRelevance}
        onChange={([reverse]) => {
          setFilters({ ...filters, reverse: reverse === "true" });
        }}
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
        selected={filters.players}
        onChange={(players) => setFilters({ ...filters, players })}
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
        selected={filters.weight}
        onChange={(weight) => setFilters({ ...filters, weight })}
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
        selected={filters.age}
        onChange={(age) => setFilters({ ...filters, age })}
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
        selected={filters.playtime}
        onChange={(playtime) => setFilters({ ...filters, playtime })}
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
        selected={[filters.rank]}
        onChange={([rank]) => {
          setFilters({ ...filters, rank });
        }}
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
        selected={[filters.rating]}
        onChange={([rating]) => {
          setFilters({ ...filters, rating });
        }}
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
        selected={[filters.ratingCount]}
        onChange={([ratingCount]) => {
          setFilters({ ...filters, ratingCount });
        }}
      />
    </div>
  );
};

export default SearchFiltersMenu;
