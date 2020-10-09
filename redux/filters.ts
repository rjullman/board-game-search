import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import Router from "next/router";
import {
  encodeQueryParams,
  decodeQueryParams,
  BooleanParam,
  StringParam,
  DelimitedArrayParam,
  DelimitedNumericArrayParam,
} from "serialize-query-params";
import { parse, stringify } from "query-string";

import { Filters, SearchFilters } from "../lib/api";

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
  mechanics: [],
  themes: [],
};

const QUERY_PARAM_TYPES = {
  keywords: StringParam,
  sort: StringParam,
  reverse: BooleanParam,
  rank: StringParam,
  rating: StringParam,
  ratingCount: StringParam,
  age: DelimitedArrayParam,
  weight: DelimitedArrayParam,
  playtime: DelimitedArrayParam,
  players: DelimitedArrayParam,
  mechanics: DelimitedNumericArrayParam,
  themes: DelimitedNumericArrayParam,
};

type FilterKey = keyof SearchFilters;

type UpdateSearchFilters = {
  keywords?: string;
  sort?: string;
  reverse?: boolean;
  rank?: string;
  rating?: string;
  ratingCount?: string;
  weight?: string[];
  age?: string[];
  playtime?: string[];
  players?: string[];
  mechanics?: number[];
  themes?: number[];
};

const equals = (a: unknown, b: unknown) => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === 0 && a.length === b.length;
  }
  return a === b;
};

const update = (filters: SearchFilters) => {
  const encodedQuery = encodeQueryParams(
    QUERY_PARAM_TYPES,
    Object.fromEntries(
      Object.entries(filters).map(([curKey, curValue]) => {
        const key = curKey as FilterKey;
        const value = !equals(DEFAULT_SEARCH_FILTERS[key], curValue)
          ? curValue
          : undefined;
        return [key, value];
      })
    )
  );
  const query = stringify(encodedQuery);
  Router.replace(`${Router.pathname}${query ? `?${query}` : ""}`, undefined, {
    shallow: true,
  });
  return filters;
};

const decodeQueryParamsStr = (paramStr: string) => {
  const params = parse(paramStr);
  return decodeQueryParams(QUERY_PARAM_TYPES, params);
};

const diff = (
  state: SearchFilters,
  update:
    | SearchFilters
    | UpdateSearchFilters
    | ReturnType<typeof decodeQueryParamsStr>
) => {
  const diff = Object.fromEntries(
    Object.entries(update)
      .map(([curKey, curValue]) => {
        const key = curKey as FilterKey;
        const value = equals(state[key], curValue) ? undefined : curValue;
        return [key, value];
      })
      .filter((kv) => kv[1] !== undefined && kv[1] !== null)
  );
  if (Object.keys(diff).length !== 0) {
    return { ...state, ...diff };
  }
  return state;
};

const filters = createSlice({
  name: "filters",
  initialState: { selected: DEFAULT_SEARCH_FILTERS, loaded: false },
  reducers: {
    reset: (state) => ({
      selected: update(diff(state.selected, DEFAULT_SEARCH_FILTERS)),
      loaded: state.loaded,
    }),
    update: (state, action: PayloadAction<UpdateSearchFilters>) => ({
      selected: update(diff(state.selected, action.payload)),
      loaded: state.loaded,
    }),
    loadFromQueryParams: (state) => {
      const search = Router.asPath.replace(/[^?]+/u, "");
      return {
        selected: diff(state.selected, decodeQueryParamsStr(search)),
        loaded: true,
      };
    },
  },
});

export const actions = filters.actions;
export default filters;
