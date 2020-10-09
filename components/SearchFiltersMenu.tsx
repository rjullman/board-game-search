import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import classnames from "classnames";
import Select from "react-select";

import { RootState } from "../redux/store";
import { actions } from "../redux/filters";
import { Filters, SearchFilters, Tag } from "../lib/api";

import HelpTooltip from "./HelpTooltip";

import IconFilter from "../images/icon-filter.svg";

import styles from "./SearchFiltersMenu.module.css";

export const countActiveFilters = (filters: SearchFilters): number => {
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
    active(filters.weight) +
    filters.mechanics.length +
    filters.themes.length
  );
};

const FilterSection: React.FC<{
  label: string;
  tooltip?: string;
  className?: string;
}> = ({ label, tooltip, className = "mt-3", children }) => (
  <div className={classnames("flex flex-col mt-3", className)}>
    <div className="flex items-center text-base font-bold">
      {label} {tooltip && <HelpTooltip>{tooltip}</HelpTooltip>}
    </div>
    {children}
  </div>
);

const FilterGroup: React.FC<{
  type: "checkbox" | "radio" | "select";
  options: string[];
  values?: string[];
  selected?: string[];
  disabled?: boolean;
  onChange?: (vals: string[]) => void;
}> = ({ type, options, values, selected = [], disabled = false, onChange }) => {
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
              name={uid}
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

  return <div className="flex flex-col">{form()}</div>;
};

const FilterByTags: React.FC<{
  options: Tag[] | undefined;
  selected: number[];
  instanceId: string;
  onChange: (ids: number[]) => void;
}> = ({ options, selected, instanceId, onChange }) => {
  const tags = useMemo(() => {
    if (!options) {
      return undefined;
    }
    return Object.fromEntries(options.map((tag) => [tag.id, tag.name]));
  }, [options]);

  const selectedVals = useMemo(() => {
    if (!tags) {
      return undefined;
    }
    return selected
      .filter((id) => id in tags)
      .map((id) => ({ value: id, label: tags[id] }));
  }, [tags, selected]);

  const sortedOptions = useMemo(() => {
    if (!options) {
      return undefined;
    }
    return options.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [options]);

  return (
    <Select
      className={classnames("react-select mt-1 text-sm", styles.react_select)}
      classNamePrefix="react-select"
      isMulti
      isSearchable
      isClearable={true}
      hideSelectedOptions={false}
      isLoading={options === undefined}
      onChange={(values) => {
        if (Array.isArray(values)) {
          onChange(values.map((val: { value: number }) => val.value));
        } else {
          onChange([]);
        }
      }}
      options={
        sortedOptions
          ? sortedOptions.map((opt) => ({ value: opt.id, label: opt.name }))
          : undefined
      }
      value={selectedVals}
      instanceId={instanceId}
    />
  );
};

const SearchFiltersMenu: React.FC<{
  instanceId: string;
}> = ({ instanceId }) => {
  const filters = useSelector((state: RootState) => state.filters.selected);
  const tags = useSelector((state: RootState) =>
    state.tags.loaded
      ? { mechanics: state.tags.mechanics, themes: state.tags.themes }
      : undefined
  );
  const dispatch = useDispatch();

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
      dispatch(actions.update({ keywords }));
    }, 250);
    return () => clearTimeout(timerId);
  }, [keywords, dispatch]);

  useEffect(() => {
    setKeywords(filters.keywords);
  }, [filters.keywords]);

  return (
    <div className="w-100">
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center">
          <IconFilter className="w-5 h-5 mr-2" />
          <div className="text-lg font-bold">Filters</div>
        </div>
        <button
          className="pt-1 text-xs underline hover:opacity-75 focus:outline-none"
          onClick={() => dispatch(actions.reset())}
        >
          Clear all ({countActiveFilters(filters)})
        </button>
      </div>
      <FilterSection label="Keywords">
        <input
          value={keywords}
          className="form-input mt-1 text-sm"
          placeholder="Search..."
          onChange={(e) => setKeywords(e.target.value)}
        />
      </FilterSection>
      <FilterSection label="Sort By">
        <FilterGroup
          type="select"
          options={["Relevance", "Rank", "Rating", "Weight"]}
          values={[
            Filters.SortByRelevance,
            Filters.SortByRank,
            Filters.SortByRating,
            Filters.SortByWeight,
          ]}
          selected={[filters.sort]}
          onChange={([sort]) => dispatch(actions.update({ sort }))}
        />
        <div className="mt-2 text-sm">
          <FilterGroup
            type="checkbox"
            options={["Reverse Order"]}
            values={["true"]}
            selected={[filters.reverse ? "true" : "false"]}
            disabled={filters.sort === Filters.SortByRelevance}
            onChange={([reverse]) =>
              dispatch(actions.update({ reverse: reverse === "true" }))
            }
          />
        </div>
      </FilterSection>
      <FilterSection
        label="Mechanics"
        tooltip="How you interact with the game. Games with similar mechanics will have similar rules, objectives, and challenges. This filter will allow partial matches, but prioritize matching more mechanics."
      >
        <FilterByTags
          options={tags && tags.mechanics}
          selected={filters.mechanics}
          instanceId={`mechanics-select-${instanceId}`}
          onChange={(mechanics) => dispatch(actions.update({ mechanics }))}
        />
      </FilterSection>
      <FilterSection
        label="Themes"
        tooltip="How the game looks and feels. Games with similar themes may have a similar graphical style, form factor, or plot. This filter will allow partial matches, but prioritize matching more themes."
      >
        <FilterByTags
          options={tags && tags.themes}
          selected={filters.themes}
          instanceId={`themes-select-${instanceId}`}
          onChange={(themes) => dispatch(actions.update({ themes }))}
        />
      </FilterSection>
      <FilterSection label="Players">
        <FilterGroup
          type="checkbox"
          options={[
            "1 Player",
            "2 Player",
            "3 Player",
            "4 Player",
            "5+ Player",
          ]}
          values={[
            Filters.Players1,
            Filters.Players2,
            Filters.Players3,
            Filters.Players4,
            Filters.Players5Plus,
          ]}
          selected={filters.players}
          onChange={(players) => dispatch(actions.update({ players }))}
        />
      </FilterSection>
      <FilterSection
        label="Weight"
        tooltip='BoardGameGeek user rating of how difficult the game is to learn and play. Lower rating ("lighter") means easier.'
      >
        <FilterGroup
          type="checkbox"
          options={["1.0–2.0", "2.0–3.0", "3.0–4.0", "4.0–5.0"]}
          values={[
            Filters.Weight1to2,
            Filters.Weight2to3,
            Filters.Weight3to4,
            Filters.Weight4to5,
          ]}
          selected={filters.weight}
          onChange={(weight) => dispatch(actions.update({ weight }))}
        />
      </FilterSection>
      <FilterSection label="Age">
        <FilterGroup
          type="checkbox"
          options={["0–4", "5–10", "11–17", "18–20", "21+"]}
          values={[
            Filters.Age0To4,
            Filters.Age5To10,
            Filters.Age11To17,
            Filters.Age18To20,
            Filters.Age21Plus,
          ]}
          selected={filters.age}
          onChange={(age) => dispatch(actions.update({ age }))}
        />
      </FilterSection>
      <FilterSection label="Playtime">
        <FilterGroup
          type="checkbox"
          options={["0–30 mins", "30–60 mins", "60–120 mins", "120+ mins"]}
          values={[
            Filters.Playtime0to30,
            Filters.Playtime30to60,
            Filters.Playtime60to120,
            Filters.Playtime120Plus,
          ]}
          selected={filters.playtime}
          onChange={(playtime) => dispatch(actions.update({ playtime }))}
        />
      </FilterSection>
      <FilterSection
        label="Rank"
        tooltip="BoardGameGeek ranking of overall game popularity (e.g. rating, number of reviews, discussion online)."
      >
        <FilterGroup
          type="radio"
          options={["any", "top 2500", "top 500", "top 100"]}
          values={[
            Filters.RankAny,
            Filters.RankTop2500,
            Filters.RankTop500,
            Filters.RankTop100,
          ]}
          selected={[filters.rank]}
          onChange={([rank]) => dispatch(actions.update({ rank }))}
        />
      </FilterSection>
      <FilterSection
        label="Rating"
        tooltip="BoardGameGeek user rating of game enjoyability and replayability. Highly rated games are not always highly ranked."
      >
        <FilterGroup
          type="radio"
          options={["any", "2+", "5+", "8+"]}
          values={[
            Filters.RatingAny,
            Filters.Rating2Plus,
            Filters.Rating5Plus,
            Filters.Rating8Plus,
          ]}
          selected={[filters.rating]}
          onChange={([rating]) => dispatch(actions.update({ rating }))}
        />
      </FilterSection>
      <FilterSection
        label="Rating Count"
        tooltip="Number of BoardGameGeek user ratings."
      >
        <FilterGroup
          type="radio"
          options={["any", "100+", "1k+", "10k+"]}
          values={[
            Filters.RatingCountAny,
            Filters.RatingCount100Plus,
            Filters.RatingCount1000Plus,
            Filters.RatingCount10000Plus,
          ]}
          selected={[filters.ratingCount]}
          onChange={([ratingCount]) =>
            dispatch(actions.update({ ratingCount }))
          }
        />
      </FilterSection>
    </div>
  );
};

export default SearchFiltersMenu;
