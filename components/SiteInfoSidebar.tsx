import React from "react";
import classnames from "classnames";

import Avatar from "../images/avatar.svg";
import IconInfoCircle from "../images/icon-info-circle.svg";
import IconExternalLink from "../images/icon-external-link.svg";

const ExternalLinkButton: React.FC<{ href: string; className?: string }> = ({
  href,
  className = "",
  children,
}) => (
  <button
    className={classnames(
      "w-full py-1 px-2",
      "bg-indigo-800 hover:bg-indigo-900 text-white",
      "rounded",
      "text-base font-semibold",
      className
    )}
  >
    <a className="inline-flex items-center min-w-0" href={href}>
      <IconExternalLink className="text-white w-4 h-4 mr-1" />
      <div>{children}</div>
    </a>
  </button>
);

const SiteInfoSidebar: React.FC = () => (
  <div
    className="flex flex-col min-h-screen px-6 py-4 justify-between bg-gray-100"
    style={{ width: "20rem" }}
  >
    <div>
      <div className="flex flex-row items-center">
        <IconInfoCircle className="w-5 h-5 mr-2" />
        <div className="text-lg font-bold">About</div>
      </div>
      <div className="pt-3 space-y-3 text-base">
        <p>Easily search for and discover your next favorite board game!</p>
        <p>
          This board game database is updated daily with the top 10,000 games.
          All game rankings and statistics are populated from BoardGameGeek.
        </p>
        <p>
          BoardGameGeek is a great site but tricky to search, especially if you
          don't already know what you're looking for – hence this site. If you
          want to dive deeper into a particular game or game-related community,
          head over to their site.
        </p>
      </div>
      <ExternalLinkButton className="my-4" href="https://boardgamegeek.com/">
        BoardGameGeek
      </ExternalLinkButton>
    </div>
    <div className="flex flex-col mt-4">
      <div className="flex flex-row">
        <Avatar className="w-16 h-16" />
        <div className="pt-3 pl-2 space-y-2">
          <p className="text-sm">Created by Bobby Ullman.</p>
          <p className="text-sm">Open sourced on GitHub.</p>
        </div>
      </div>
      <ExternalLinkButton className="mt-3" href="http://bobbyullman.com/">
        My Website
      </ExternalLinkButton>
      <ExternalLinkButton
        className="mt-3"
        href="https://github.com/rjullman/board-game-search/"
      >
        GitHub Repo
      </ExternalLinkButton>
    </div>
  </div>
);

export default SiteInfoSidebar;
