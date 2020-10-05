import React from "react";

import IconDocumentSearch from "../images/icon-document-search.svg";

const NoSearchResults: React.FC = () => (
  <div className="mt-6 text-center">
    <IconDocumentSearch className="w-24 h-24 mx-auto text-indigo-800" />
    <div className="pt-3 text-lg font-semibold">
      We've looked everywhere, but can't find a game matching your search.
    </div>
  </div>
);

export default NoSearchResults;
