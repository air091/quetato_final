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

const PlayerAvatar = ({
  username = "Unknown Player",
  size = "md",
  customImageUrl,
}) => {
  // If the player already has a custom uploaded avatar image, use it instead
  if (customImageUrl) {
    return (
      <img
        src={customImageUrl}
        alt={`${username}'s profile`}
        className={`rounded-full object-cover border shadow-xs select-none pointer-events-none ${
          size === "sm" ? "w-6 h-6" : size === "lg" ? "w-12 h-12" : "w-8 h-8"
        }`}
      />
    );
  }

  // 1. Get Initials (e.g., "John Doe" -> "JD", "alex" -> "AL")
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

  // 2. Pick a stable background color index based on username hash string code
  // This ensures the same player always gets the exact same background color across views
  const hash = Array.from(username).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );
  const colorClass = PRESET_COLORS[hash % PRESET_COLORS.length];

  // 3. Define size classes
  const sizeClasses = {
    sm: "w-6 h-6 text-[10px] font-bold",
    md: "w-8 h-8 text-[12px] font-bold tracking-wider",
    lg: "w-12 h-12 text-[16px] font-bold tracking-wide",
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full border shadow-xs select-none pointer-events-none uppercase font-mono ${
        sizeClasses[size] || sizeClasses.md
      } ${colorClass}`}
    >
      {initials}
    </div>
  );
};

export default PlayerAvatar;
