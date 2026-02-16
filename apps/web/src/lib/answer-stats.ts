export interface ChoiceStat {
  count: number;
  percent: number;
}

export type ChoiceStats = Record<string, ChoiceStat>;

export function buildChoiceStats(
  choices: Array<{ id: string }>,
  answers: Map<string, string[]>,
): { choiceStats: ChoiceStats; totalAnswered: number } {
  const choiceStats: ChoiceStats = Object.fromEntries(
    choices.map((choice) => [choice.id, { count: 0, percent: 0 }]),
  );

  let totalAnswered = 0;

  answers.forEach((submittedChoices) => {
    const selectedChoiceId = submittedChoices[0];
    if (!selectedChoiceId || !choiceStats[selectedChoiceId]) {
      return;
    }

    choiceStats[selectedChoiceId].count += 1;
    totalAnswered += 1;
  });

  if (totalAnswered > 0) {
    Object.keys(choiceStats).forEach((choiceId) => {
      choiceStats[choiceId].percent = Math.round(
        (choiceStats[choiceId].count / totalAnswered) * 100,
      );
    });
  }

  return { choiceStats, totalAnswered };
}
