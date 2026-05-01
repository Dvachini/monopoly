// Game engine - core monopoly logic converted to ES module
// This module exports the Game class and utility functions

import { Player, Trade as TradeModel } from './models.jsx';
import { AITest } from './ai.jsx';
import { classicEdition } from '../data/classicedition.jsx';
import { newYorkCityEdition } from '../data/newyorkcityedition.jsx';

export function createGameEngine(edition = 'classic') {
  const editionData =
    edition === 'nyc' ? newYorkCityEdition() : classicEdition();
  const { square, communityChestCards, chanceCards } = editionData;

  // Set up groups
  const groupPropertyArray = [];
  for (let i = 0; i < 40; i++) {
    const groupNumber = square[i].groupNumber;
    if (groupNumber > 0) {
      if (!groupPropertyArray[groupNumber]) {
        groupPropertyArray[groupNumber] = [];
      }
      groupPropertyArray[groupNumber].push(i);
    }
  }

  for (let i = 0; i < 40; i++) {
    const groupNumber = square[i].groupNumber;
    if (groupNumber > 0) {
      square[i].group = groupPropertyArray[groupNumber];
    }
    square[i].index = i;
  }

  // Shuffle decks
  communityChestCards.index = 0;
  chanceCards.index = 0;
  communityChestCards.deck = Array.from({ length: 16 }, (_, i) => i);
  chanceCards.deck = Array.from({ length: 16 }, (_, i) => i);
  communityChestCards.deck.sort(() => Math.random() - 0.5);
  chanceCards.deck.sort(() => Math.random() - 0.5);

  return {
    square,
    communityChestCards,
    chanceCards,
  };
}

export function rollDice() {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  return { die1, die2 };
}

export function calculateRent(
  square,
  squares,
  position,
  die1,
  die2,
  increasedRent,
) {
  const s = squares[position];
  let rent = 0;

  // Railroads
  if (position === 5 || position === 15 || position === 25 || position === 35) {
    rent = increasedRent ? 25 : 12.5;
    if (s.owner === squares[5].owner) rent *= 2;
    if (s.owner === squares[15].owner) rent *= 2;
    if (s.owner === squares[25].owner) rent *= 2;
    if (s.owner === squares[35].owner) rent *= 2;
  } else if (position === 12) {
    rent =
      increasedRent || squares[28].owner === s.owner
        ? (die1 + die2) * 10
        : (die1 + die2) * 4;
  } else if (position === 28) {
    rent =
      increasedRent || squares[12].owner === s.owner
        ? (die1 + die2) * 10
        : (die1 + die2) * 4;
  } else {
    let groupowned = true;
    for (let i = 0; i < 40; i++) {
      if (
        squares[i].groupNumber === s.groupNumber &&
        squares[i].owner !== s.owner
      ) {
        groupowned = false;
      }
    }

    if (!groupowned) {
      rent = s.baserent;
    } else {
      if (s.house === 0) {
        rent = s.baserent * 2;
      } else {
        rent = s['rent' + s.house];
      }
    }
  }

  return rent;
}

export { AITest };
