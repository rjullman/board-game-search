import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";

import filters from "./filters";
import tags from "./tags";

const reducer = combineReducers({
  filters: filters.reducer,
  tags: tags.reducer,
});

const store = configureStore({ reducer });

export type RootState = ReturnType<typeof reducer>;
export type AppDispatch = typeof store.dispatch;
export default store;
