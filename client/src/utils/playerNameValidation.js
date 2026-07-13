export const parsePlayerNames = (namesText) =>
  namesText
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);

export const normalizePlayerName = (name) => name.trim().toLowerCase();

export const getPlayerNameValidation = (namesText, existingNames = []) => {
  const names = parsePlayerNames(namesText);
  const existingNameSet = new Set(existingNames.map(normalizePlayerName));
  const seenNames = new Set();
  const repeatedInInput = [];
  const alreadyExisting = [];

  names.forEach((name) => {
    const normalizedName = normalizePlayerName(name);

    if (seenNames.has(normalizedName)) {
      repeatedInInput.push(name);
    } else {
      seenNames.add(normalizedName);
    }

    if (existingNameSet.has(normalizedName)) {
      alreadyExisting.push(name);
    }
  });

  const messages = [];
  if (alreadyExisting.length > 0) {
    messages.push(`Already exists: ${[...new Set(alreadyExisting)].join(", ")}`);
  }
  if (repeatedInInput.length > 0) {
    messages.push(
      `Typed more than once: ${[...new Set(repeatedInInput)].join(", ")}`,
    );
  }

  return {
    names,
    repeatedInInput,
    alreadyExisting,
    hasError: messages.length > 0,
    message: messages.join(". "),
  };
};
