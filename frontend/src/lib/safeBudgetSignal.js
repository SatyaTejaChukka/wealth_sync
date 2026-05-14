function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clampNumber(value, min = 0, max = 1) {
  const numeric = toFiniteNumber(value, min);
  return Math.min(max, Math.max(min, numeric));
}

function safeDivide(numerator, denominator, fallback = 0) {
  const safeNumerator = toFiniteNumber(numerator, 0);
  const safeDenominator = toFiniteNumber(denominator, 0);
  if (safeDenominator === 0) {
    return fallback;
  }
  return safeNumerator / safeDenominator;
}

const ORB_STATE_SCORE = {
  careful: 0,
  mindful: 0.5,
  carefree: 1,
};

function scoreToOrbState(score) {
  if (score >= 0.67) {
    return 'carefree';
  }
  if (score >= 0.38) {
    return 'mindful';
  }
  return 'careful';
}

function scoreToWeatherState(score) {
  if (score >= 0.67) {
    return 'calm';
  }
  if (score >= 0.38) {
    return 'balanced';
  }
  return 'cautious';
}

function resolveConservativeOrbState(serverState, derivedState) {
  const serverScore = ORB_STATE_SCORE[serverState];
  const computedScore = ORB_STATE_SCORE[derivedState];
  if (serverScore == null) {
    return derivedState;
  }
  if (computedScore == null) {
    return serverState;
  }
  return serverScore <= computedScore ? serverState : derivedState;
}

function nowMonthStats() {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
  return { daysInMonth, daysLeft };
}

export function calculateSafeBudgetSignal(payload = {}) {
  const breakdown = payload?.breakdown || {};

  const monthlySafeTotal = Math.max(
    0,
    toFiniteNumber(payload.monthly_safe_total ?? payload.monthly_free_budget, 0)
  );
  const remainingBudget = Math.max(
    0,
    toFiniteNumber(breakdown.remaining_budget ?? payload.safe_to_spend, 0)
  );
  const dailyLimit = Math.max(0, toFiniteNumber(payload.daily_limit ?? breakdown.remaining_today, 0));
  const spentToday = Math.max(0, toFiniteNumber(breakdown.spent_today, 0));
  const spentThisMonth = Math.max(
    0,
    toFiniteNumber(breakdown.spent_this_month ?? payload.total_spent_month, 0)
  );
  const monthlyIncome = Math.max(
    0,
    toFiniteNumber(breakdown.monthly_income ?? payload.total_income, 0)
  );
  const monthlyCommitted = Math.max(
    0,
    toFiniteNumber(breakdown.monthly_committed ?? payload.total_committed, 0)
  );

  const { daysInMonth, daysLeft: inferredDaysLeft } = nowMonthStats();
  const daysLeftRaw = Math.round(toFiniteNumber(payload.days_left_in_month, inferredDaysLeft));
  const daysLeft = Math.min(daysInMonth, Math.max(1, daysLeftRaw));
  const daysElapsed = Math.min(daysInMonth, Math.max(1, daysInMonth - daysLeft + 1));

  const hasSignal = [
    monthlySafeTotal,
    remainingBudget,
    dailyLimit,
    spentToday,
    spentThisMonth,
    monthlyIncome,
    monthlyCommitted,
  ].some((value) => value > 0);

  if (!hasSignal) {
    const fallbackState = payload?.color_state || 'mindful';
    const fallbackScore = ORB_STATE_SCORE[fallbackState] ?? 0.5;
    return {
      score: fallbackScore,
      orbState: fallbackState,
      weatherState: scoreToWeatherState(fallbackScore),
      runwayPercentage: Math.round(clampNumber(toFiniteNumber(payload?.percentage, 0), 0, 100)),
      ratios: {
        runway: 0,
        pacing: 1,
        dailySpend: 0,
        burn: 0,
        commitments: 0,
      },
      values: {
        monthlySafeTotal,
        remainingBudget,
        dailyLimit,
        spentToday,
        spentThisMonth,
        monthlyIncome,
        monthlyCommitted,
        daysInMonth,
        daysLeft,
      },
    };
  }

  const expectedRemaining = monthlySafeTotal * safeDivide(daysLeft, daysInMonth, 0);
  const runwayRatio = safeDivide(remainingBudget, monthlySafeTotal, 0);
  const pacingRatio = expectedRemaining > 0 ? remainingBudget / expectedRemaining : 1;
  const dailySpendRatio = dailyLimit > 0 ? spentToday / dailyLimit : spentToday > 0 ? 2 : 0;
  const averageSpendPerDay = safeDivide(spentThisMonth, daysElapsed, 0);
  const targetSpendPerDay = safeDivide(monthlySafeTotal, daysInMonth, 0);
  const burnRatio = targetSpendPerDay > 0 ? averageSpendPerDay / targetSpendPerDay : spentThisMonth > 0 ? 2 : 0;
  const commitmentsRatio = safeDivide(monthlyCommitted, monthlyIncome, monthlyIncome > 0 ? 0 : 1);

  const runwayScore = clampNumber(Math.pow(clampNumber(runwayRatio / 1.25, 0, 1), 0.65), 0, 1);
  const pacingScore = clampNumber(Math.pow(clampNumber(pacingRatio / 1.4, 0, 1), 0.8), 0, 1);
  const burnScore = clampNumber(1 - Math.max(0, burnRatio - 1) / 1.2, 0, 1);
  const dailyScore = clampNumber(1 - Math.max(0, dailySpendRatio - 1) / 1.2, 0, 1);
  const commitmentsScore = clampNumber(1 - Math.max(0, commitmentsRatio - 0.55) / 0.6, 0, 1);

  const score = clampNumber(
    0.44 * runwayScore +
      0.24 * pacingScore +
      0.14 * burnScore +
      0.1 * dailyScore +
      0.08 * commitmentsScore,
    0,
    1
  );

  const derivedState = scoreToOrbState(score);
  const orbState = resolveConservativeOrbState(payload?.color_state, derivedState);

  return {
    score,
    orbState,
    weatherState: scoreToWeatherState(score),
    runwayPercentage: Math.round(clampNumber(toFiniteNumber(payload?.percentage, runwayRatio * 100), 0, 100)),
    ratios: {
      runway: runwayRatio,
      pacing: pacingRatio,
      dailySpend: dailySpendRatio,
      burn: burnRatio,
      commitments: commitmentsRatio,
    },
    values: {
      monthlySafeTotal,
      remainingBudget,
      dailyLimit,
      spentToday,
      spentThisMonth,
      monthlyIncome,
      monthlyCommitted,
      daysInMonth,
      daysLeft,
    },
  };
}

export function calculateOrbSize(score, { min = 120, max = 200 } = {}) {
  const normalized = clampNumber(score, 0, 1);
  const eased = 1 - Math.pow(1 - normalized, 2.2);
  return min + (max - min) * eased;
}

export function calculateMiniOrbScale(value, { total = 0, reference = 0, min = 0.72, max = 1.18 } = {}) {
  const amount = Math.max(0, toFiniteNumber(value, 0));
  const totalBase = Math.max(0, toFiniteNumber(total, 0));
  const referenceBase = Math.max(0, toFiniteNumber(reference, 0));

  if (totalBase <= 0 && referenceBase <= 0) {
    return (min + max) / 2;
  }

  const share = safeDivide(amount, totalBase, 0);
  const shareSignal = Math.sqrt(clampNumber(share, 0, 1));
  const referenceSignal =
    referenceBase > 0 ? clampNumber(Math.log1p(amount / referenceBase) / Math.log1p(4), 0, 1) : shareSignal;
  const combinedSignal = 0.62 * shareSignal + 0.38 * referenceSignal;

  return min + (max - min) * combinedSignal;
}
