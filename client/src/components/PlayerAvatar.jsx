import React from "react";

const PRESET_COLORS = [
  "bg-blue-500 text-white border-blue-600",
  "bg-emerald-500 text-white border-emerald-600",
  "bg-indigo-500 text-white border-indigo-600",
  "bg-violet-500 text-white border-violet-600",
  "bg-amber-500 text-white border-amber-600",
  "bg-orange-500 text-white border-orange-600",
  "bg-rose-500 text-white border-rose-600",
  "bg-cyan-500 text-white border-cyan-600",
];

const SIZE_MAP = {
  sm: { dimensions: "w-6 h-6", font: "text-[10px] font-bold" },
  md: { dimensions: "w-8 h-8", font: "text-[12px] font-bold tracking-wider" },
  lg: { dimensions: "w-12 h-12", font: "text-[16px] font-bold tracking-wide" },
  xl: { dimensions: "w-16 h-16", font: "text-[24px] font-bold" },
};

const ROUNDED_MAP = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

const PlayerAvatar = ({
  username = "Unknown Player",
  size = "md",
  rounded = "full",
  customImageUrl,
}) => {
  const currentSize = SIZE_MAP[size] || SIZE_MAP.md;
  const roundedClass = ROUNDED_MAP[rounded] || ROUNDED_MAP.full;

  // 💡 REMOVED 'pointer-events-none' from here
  const baseImgClasses = `object-cover border shadow-xs select-none ${roundedClass}`;

  // If the player already has a custom uploaded avatar image, use it instead
  if (customImageUrl) {
    return (
      <img
        src={customImageUrl}
        alt={`${username}'s profile`}
        title={username} // 💡 Added title here too so custom images show tooltips
        className={`${baseImgClasses} ${currentSize.dimensions}`}
      />
    );
  }

  // 1. Get Initials
  const cleanedName = username.trim().toUpperCase();
  const parts = cleanedName.split(/\s+/);
  let initials = "";
  if (parts.length > 1) {
    initials = parts[0][0] + parts[parts.length - 1][0];
  } else if (cleanedName.length > 1) {
    initials = cleanedName.slice(0, 2);
  } else {
    initials = cleanedName[0] || "?";
  }

  // 2. Pick a stable background color
  const hash = Array.from(username).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );
  const colorClass = PRESET_COLORS[hash % PRESET_COLORS.length];

  return (
    <div
      title={username} // 💡 Using the original username looks cleaner in tooltips than full UPPERCASE
      // 💡 REMOVED 'pointer-events-none' from the template literal below
      className={`flex items-center justify-center border shadow-xs select-none uppercase font-mono ${roundedClass} ${
        currentSize.dimensions
      } ${currentSize.font} ${colorClass}`}
    >
      {initials}
    </div>
  );
};

export default PlayerAvatar;
