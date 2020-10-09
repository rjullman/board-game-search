import React from "react";
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from "next/document";

const GoogleAnalyticsScripts: React.FC<{ id: string }> = ({ id }) => (
  <>
    <script
      async
      src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
    ></script>
    <script
      dangerouslySetInnerHTML={{
        __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', '${id}');`,
      }}
    />
  </>
);

class CustomDocument extends Document {
  static async getInitialProps(
    ctx: DocumentContext
  ): Promise<DocumentInitialProps> {
    const initialProps = await Document.getInitialProps(ctx);
    return initialProps;
  }

  render(): JSX.Element {
    return (
      <Html>
        <Head>
          {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
            <GoogleAnalyticsScripts
              id={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}
            />
          )}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default CustomDocument;
