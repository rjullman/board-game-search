import React from "react";
import Sidebar from "react-sidebar";

const SidebarWrapper: React.FC<{
  open: boolean;
  onSetOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ open, onSetOpen, children }) => {
  return (
    <Sidebar
      open={open}
      onSetOpen={onSetOpen}
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
      }}
      sidebar={children}
    >
      {/* This component requires a child. */}
      <div />
    </Sidebar>
  );
};

export default SidebarWrapper;
