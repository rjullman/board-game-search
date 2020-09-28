import React from "react";
import { AppProps } from "next/app";

import "react-tippy/dist/tippy.css";

import QueryParamProvider from "../components/QueryParamProvider";

import "../styles/tailwind.css";

export default function MyApp({
  Component,
  pageProps,
}: AppProps): React.ReactElement {
  return (
    <QueryParamProvider>
      <Component {...pageProps} />
    </QueryParamProvider>
  );
}
