import React from "react";
import Sidebar from "react-sidebar";

const SidebarWrapper: React.FC<{
  open: boolean;
  onSetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pullRight?: boolean;
}> = ({ open, onSetOpen, pullRight = false, children }) => {
  return (
    <Sidebar
      open={open}
      onSetOpen={onSetOpen}
      pullRight={pullRight}
      styles={{
        sidebar: {
          position: "fixed",
          zIndex: "50",
        },
        root: {
          position: "undefined",
        },
        content: {
          position: "undefined",
          top: "undefined",
          left: "undefined",
          right: "undefined",
          bottom: "undefined",
        },
        overlay: {
          zIndex: "40",
        },
      }}
      sidebar={children}
    >
      {/* This component requires a child. */}
      <div />
    </Sidebar>
  );
};

export default SidebarWrapper;
