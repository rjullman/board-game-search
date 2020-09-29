import React from "react";

const DocumentSearchIcon: React.FC<{ className?: string }> = ({
  className,
}) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"
    />
  </svg>
);

const NoSearchResults: React.FC = () => (
  <div className="mt-6 text-center">
    <DocumentSearchIcon className="w-24 h-24 mx-auto text-indigo-800" />
    <div className="pt-3 text-lg font-semibold">
      We've looked everywhere, but can't find a game matching your search.
    </div>
  </div>
);

export default NoSearchResults;
