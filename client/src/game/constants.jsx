// Starting cash choices (same list the server allows in sockets/validate.js)
export const STARTING_CASH_OPTIONS = [500, 1000, 1500, 2000, 5000, 10000];
export const DEFAULT_STARTING_CASH = 1500;

// A player is bankrupt when money drops below minus the starting cash
// (keep identical to sockets/validate.js, which is covered by test/validate.test.js)
export function bankruptcyLimit(startingMoney = DEFAULT_STARTING_CASH) {
  return -startingMoney;
}

export function isBankrupt(money, startingMoney = DEFAULT_STARTING_CASH) {
  return money < bankruptcyLimit(startingMoney);
}
