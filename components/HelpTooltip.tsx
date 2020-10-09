import React from "react";
import { Tooltip } from "react-tippy";

import IconHelp from "../images/icon-question-circle.svg";

const HelpTooltip: React.FC = ({ children }) => {
  return (
    <Tooltip
      html={<div className="w-40 text-xs">{children}</div>}
      position="right-start"
      popperOptions={{
        modifiers: {
          preventOverflow: {
            boundariesElement: "window",
          },
        },
      }}
      arrow={true}
    >
      <div className="pl-1">
        <IconHelp className="w-4 h-4 text-gray-800 hover:text-black" />
      </div>
    </Tooltip>
  );
};

export default HelpTooltip;
