const VOLLEYBALL_SLOT_LAYOUT = [
  { team: "a", number: 5 },
  { team: "a", number: 4 },
  { team: "b", number: 4 },
  { team: "b", number: 5 },
  { team: "a", number: 6 },
  { team: "a", number: 3 },
  { team: "b", number: 3 },
  { team: "b", number: 6 },
  { team: "a", number: 1 },
  { team: "a", number: 2 },
  { team: "b", number: 2 },
  { team: "b", number: 1 },
];

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
    maxMatchCourts: null,
    maxQueueCourts: null,
    teamForPosition: (position) => VOLLEYBALL_SLOT_LAYOUT[position].team,
    slotLabelForPosition: (position) => {
      const slot = VOLLEYBALL_SLOT_LAYOUT[position];
      return `${slot.team.toUpperCase()}${slot.number}`;
    },
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
  const {
    playersPerTeam,
    positions,
    maxMatchCourts,
    maxQueueCourts,
    teamForPosition,
    slotLabelForPosition,
  } = getSportGameRules(sport);
  return {
    playersPerTeam,
    playersPerCourt: positions.length,
    positions,
    slotLabels: positions.map((position) => ({
      position,
      team: teamForPosition(position),
      label: slotLabelForPosition
        ? slotLabelForPosition(position)
        : `Player ${teamForPosition(position).toUpperCase()}-${Math.floor(position / 2) + 1}`,
    })),
    maxMatchCourts,
    maxQueueCourts,
  };
};
