import { AppProps } from "next/app";

import "react-tippy/dist/tippy.css";

import "../styles/tailwind.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
