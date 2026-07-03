import React from "react";

const PlayerSettings = ({ type }) => {
  return (
    <div className="absolute top-0 right-0">
      {type === "static" ? (
        <>
          <button>Edit</button>
          <button>Delete</button>
        </>
      ) : (
        <>
          <button>kick player</button>
        </>
      )}
    </div>
  );
};

export default PlayerSettings;
