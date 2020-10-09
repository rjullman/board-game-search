import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { loadTags, Tag } from "../lib/api";

const fetchTags = createAsyncThunk("users/fetchTags", async () => {
  return loadTags();
});

export const actions = { fetchTags };

const INITIAL_STATE: { themes: Tag[]; mechanics: Tag[]; loaded: boolean } = {
  themes: [],
  mechanics: [],
  loaded: false,
};

export default createSlice({
  name: "tags",
  initialState: INITIAL_STATE,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchTags.fulfilled, (state, { payload }) => {
      state.mechanics = payload.mechanics;
      state.themes = payload.themes;
      state.loaded = true;
    });
  },
});
