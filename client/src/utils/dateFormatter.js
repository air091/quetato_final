export const formatElapsedTime = (pastIsoString) => {
  if (!pastIsoString) return "00:00:00";

  const past = new Date(pastIsoString).getTime();
  const now = Date.now();
  const diffInSeconds = Math.max(0, Math.floor((now - past) / 1000));

  const hours = Math.floor(diffInSeconds / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);
  const seconds = diffInSeconds % 60;

  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
};

export const formatCommunityDate = (dateInput) => {
  if (!dateInput) return "";

  const date = new Date(dateInput);

  // Guard against invalid dates passing through
  if (isNaN(date.getTime())) return "";

  // Options configuration for standard international formats
  const options = {
    month: "short", // "Jul"
    day: "2-digit", // "05"
    year: "numeric", // "2026"
  };

  return new Intl.DateTimeFormat("en-US", options).format(date);
};
