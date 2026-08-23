const SPORT_GAME_RULES = {
  badminton: {
    playersPerTeam: 2,
    positions: [0, 1, 2, 3],
    maxMatchCourts: null,
    maxQueueCourts: null,
    teamForPosition: (position) => (position % 2 === 0 ? "a" : "b"),
  },
  volleyball: {
    playersPerTeam: 6,
    positions: Array.from({ length: 12 }, (_, position) => position),
    maxMatchCourts: 1,
    maxQueueCourts: 1,
    // Keep alternating team positions, matching badminton and the existing
    // drag-and-drop protocol, while expanding each team to six players.
    teamForPosition: (position) => (position % 2 === 0 ? "a" : "b"),
  },
};

export const getSportGameRules = (sport) => {
  const rules = SPORT_GAME_RULES[sport];
  if (!rules) {
    throw new Error(`No game rules are configured for sport: ${sport}`);
  }

  return rules;
};

export const getSportGameRulesPayload = (sport) => {
  const { playersPerTeam, positions, maxMatchCourts, maxQueueCourts } =
    getSportGameRules(sport);
  return {
    playersPerTeam,
    playersPerCourt: positions.length,
    positions,
    maxMatchCourts,
    maxQueueCourts,
  };
};
