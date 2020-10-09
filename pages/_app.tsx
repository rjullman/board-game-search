import React from "react";
import { Provider } from "react-redux";
import Head from "next/head";
import { AppProps } from "next/app";

import "react-tippy/dist/tippy.css";

import store from "../redux/store";

import "../styles/tailwind.css";

const HeadMetadata: React.FC = () => {
  if (!process.env.NEXT_PUBLIC_CANONICAL_URL) {
    throw new Error(
      "NEXT_PUBLIC_CANONICAL_URL environment variable must be defined."
    );
  }
  const url = process.env.NEXT_PUBLIC_CANONICAL_URL.replace(/\/+$/, "");
  return (
    <Head>
      <title>Board Game Search</title>
      <meta charSet="utf-8" />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      <meta name="robots" content="index, follow" />
      <meta
        name="description"
        content="Easily search for and discover your next favorite board game! Our board game database is updated daily with the top 10,000 games."
      />

      <meta property="og:type" content="website" />
      <meta property="og:title" content="Board Game Search" />
      <meta
        property="og:description"
        content="Easily search for and discover your next favorite board game!"
      />
      <meta property="og:image" content={`${url}/logo.jpg`} />
      <meta property="og:url" content={url} />

      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#3c366b" />
      <meta name="apple-mobile-web-app-title" content="Board Game Search" />
      <meta name="application-name" content="Board Game Search" />
      <meta name="msapplication-TileColor" content="#9f00a7" />
      <meta name="theme-color" content="#3c366b" />
    </Head>
  );
};

export default function MyApp({
  Component,
  pageProps,
}: AppProps): React.ReactElement {
  return (
    <Provider store={store}>
      <HeadMetadata />
      <Component {...pageProps} />
    </Provider>
  );
}
