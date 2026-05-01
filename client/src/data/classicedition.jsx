import { Square, Card } from '../game/models.jsx';

export function classicEdition() {
  const square = [];

  square[0] = new Square('GO', 'COLLECT $200 SALARY AS YOU PASS.', '#FFFFFF');
  square[1] = new Square(
    'Mediterranean Avenue',
    '$60',
    '#8B4513',
    60,
    3,
    2,
    10,
    30,
    90,
    160,
    250,
  );
  square[2] = new Square(
    'Community Chest',
    'FOLLOW INSTRUCTIONS ON TOP CARD',
    '#FFFFFF',
  );
  square[3] = new Square(
    'Baltic Avenue',
    '$60',
    '#8B4513',
    60,
    3,
    4,
    20,
    60,
    180,
    320,
    450,
  );
  square[4] = new Square('City Tax', 'Pay $200', '#FFFFFF');
  square[5] = new Square('Reading Railroad', '$200', '#FFFFFF', 200, 1);
  square[6] = new Square(
    'Oriental Avenue',
    '$100',
    '#87CEEB',
    100,
    4,
    6,
    30,
    90,
    270,
    400,
    550,
  );
  square[7] = new Square(
    'Chance',
    'FOLLOW INSTRUCTIONS ON TOP CARD',
    '#FFFFFF',
  );
  square[8] = new Square(
    'Vermont Avenue',
    '$100',
    '#87CEEB',
    100,
    4,
    6,
    30,
    90,
    270,
    400,
    550,
  );
  square[9] = new Square(
    'Connecticut Avenue',
    '$120',
    '#87CEEB',
    120,
    4,
    8,
    40,
    100,
    300,
    450,
    600,
  );
  square[10] = new Square('Just Visiting', '', '#FFFFFF');
  square[11] = new Square(
    'St. Charles Place',
    '$140',
    '#FF0080',
    140,
    5,
    10,
    50,
    150,
    450,
    625,
    750,
  );
  square[12] = new Square('Electric Company', '$150', '#FFFFFF', 150, 2);
  square[13] = new Square(
    'States Avenue',
    '$140',
    '#FF0080',
    140,
    5,
    10,
    50,
    150,
    450,
    625,
    750,
  );
  square[14] = new Square(
    'Virginia Avenue',
    '$160',
    '#FF0080',
    160,
    5,
    12,
    60,
    180,
    500,
    700,
    900,
  );
  square[15] = new Square('Pennsylvania Railroad', '$200', '#FFFFFF', 200, 1);
  square[16] = new Square(
    'St. James Place',
    '$180',
    '#FFA500',
    180,
    6,
    14,
    70,
    200,
    550,
    750,
    950,
  );
  square[17] = new Square(
    'Community Chest',
    'FOLLOW INSTRUCTIONS ON TOP CARD',
    '#FFFFFF',
  );
  square[18] = new Square(
    'Tennessee Avenue',
    '$180',
    '#FFA500',
    180,
    6,
    14,
    70,
    200,
    550,
    750,
    950,
  );
  square[19] = new Square(
    'New York Avenue',
    '$200',
    '#FFA500',
    200,
    6,
    16,
    80,
    220,
    600,
    800,
    1000,
  );
  square[20] = new Square('Free Parking', '', '#FFFFFF');
  square[21] = new Square(
    'Kentucky Avenue',
    '$220',
    '#FF0000',
    220,
    7,
    18,
    90,
    250,
    700,
    875,
    1050,
  );
  square[22] = new Square(
    'Chance',
    'FOLLOW INSTRUCTIONS ON TOP CARD',
    '#FFFFFF',
  );
  square[23] = new Square(
    'Indiana Avenue',
    '$220',
    '#FF0000',
    220,
    7,
    18,
    90,
    250,
    700,
    875,
    1050,
  );
  square[24] = new Square(
    'Illinois Avenue',
    '$240',
    '#FF0000',
    240,
    7,
    20,
    100,
    300,
    750,
    925,
    1100,
  );
  square[25] = new Square('B&O Railroad', '$200', '#FFFFFF', 200, 1);
  square[26] = new Square(
    'Atlantic Avenue',
    '$260',
    '#FFFF00',
    260,
    8,
    22,
    110,
    330,
    800,
    975,
    1150,
  );
  square[27] = new Square(
    'Ventnor Avenue',
    '$260',
    '#FFFF00',
    260,
    8,
    22,
    110,
    330,
    800,
    975,
    1150,
  );
  square[28] = new Square('Water Works', '$150', '#FFFFFF', 150, 2);
  square[29] = new Square(
    'Marvin Gardens',
    '$280',
    '#FFFF00',
    280,
    8,
    24,
    120,
    360,
    850,
    1025,
    1200,
  );
  square[30] = new Square(
    'Go to Jail',
    'Go directly to Jail. Do not pass GO. Do not collect $200.',
    '#FFFFFF',
  );
  square[31] = new Square(
    'Pacific Avenue',
    '$300',
    '#008000',
    300,
    9,
    26,
    130,
    390,
    900,
    1100,
    1275,
  );
  square[32] = new Square(
    'North Carolina Avenue',
    '$300',
    '#008000',
    300,
    9,
    26,
    130,
    390,
    900,
    1100,
    1275,
  );
  square[33] = new Square(
    'Community Chest',
    'FOLLOW INSTRUCTIONS ON TOP CARD',
    '#FFFFFF',
  );
  square[34] = new Square(
    'Pennsylvania Avenue',
    '$320',
    '#008000',
    320,
    9,
    28,
    150,
    450,
    1000,
    1200,
    1400,
  );
  square[35] = new Square('Short Line', '$200', '#FFFFFF', 200, 1);
  square[36] = new Square(
    'Chance',
    'FOLLOW INSTRUCTIONS ON TOP CARD',
    '#FFFFFF',
  );
  square[37] = new Square(
    'Park Place',
    '$350',
    '#0000FF',
    350,
    10,
    35,
    175,
    500,
    1100,
    1300,
    1500,
  );
  square[38] = new Square('LUXURY TAX', 'Pay $100', '#FFFFFF');
  square[39] = new Square(
    'Boardwalk',
    '$400',
    '#0000FF',
    400,
    10,
    50,
    200,
    600,
    1400,
    1700,
    2000,
  );

  const communityChestCards = [];
  communityChestCards[0] = new Card(
    'Get out of Jail, Free. This card may be kept until needed or sold.',
    function (p) {
      p.communityChestJailCard = true;
    },
  );
  communityChestCards[1] = new Card(
    'You have won second prize in a beauty contest. Collect $10.',
    function (p) {
      p.money += 10;
    },
  );
  communityChestCards[2] = new Card(
    'From sale of stock, you get $50.',
    function (p) {
      p.money += 50;
    },
  );
  communityChestCards[3] = new Card(
    'Life insurance matures. Collect $100.',
    function (p) {
      p.money += 100;
    },
  );
  communityChestCards[4] = new Card(
    'Income tax refund. Collect $20.',
    function (p) {
      p.money += 20;
    },
  );
  communityChestCards[5] = new Card(
    'Holiday fund matures. Receive $100.',
    function (p) {
      p.money += 100;
    },
  );
  communityChestCards[6] = new Card('You inherit $100.', function (p) {
    p.money += 100;
  });
  communityChestCards[7] = new Card('Receive $25 consultancy fee.', function (
    p,
  ) {
    p.money += 25;
  });
  communityChestCards[8] = new Card('Pay hospital fees of $100.', function (p) {
    p.money -= 100;
  });
  communityChestCards[9] = new Card(
    'Bank error in your favor. Collect $200.',
    function (p) {
      p.money += 200;
    },
  );
  communityChestCards[10] = new Card('Pay school fees of $50.', function (p) {
    p.money -= 50;
  });
  communityChestCards[11] = new Card("Doctor's fee. Pay $50.", function (p) {
    p.money -= 50;
  });
  communityChestCards[12] = new Card(
    'It is your birthday. Collect $10 from every player.',
    function (p, ctx) {
      // ctx = { players, pcount, turn }
      if (ctx) {
        for (let i = 1; i <= ctx.pcount; i++) {
          if (i !== ctx.turn) {
            ctx.players[i].money -= 10;
            p.money += 10;
          }
        }
      }
    },
  );
  communityChestCards[13] = new Card(
    'Advance to "GO" (Collect $200).',
    function (p) {
      p.position = 0;
      p.money += 200;
    },
  );
  communityChestCards[14] = new Card(
    'You are assessed for street repairs. $40 per house. $115 per hotel.',
    function (p, ctx) {
      if (ctx) {
        let cost = 0;
        for (let i = 0; i < 40; i++) {
          if (ctx.squares[i].owner === p.index) {
            if (ctx.squares[i].house === 5) cost += 115;
            else cost += ctx.squares[i].house * 40;
          }
        }
        p.money -= cost;
      }
    },
  );
  communityChestCards[15] = new Card(
    'Go to Jail. Go directly to Jail. Do not pass "GO". Do not collect $200.',
    function (p) {
      p.jail = true;
      p.position = 10;
    },
  );

  const chanceCards = [];
  chanceCards[0] = new Card(
    'GET OUT OF JAIL FREE. This card may be kept until needed or traded.',
    function (p) {
      p.chanceJailCard = true;
    },
  );
  chanceCards[1] = new Card(
    'Make General Repairs on All Your Property. For each house pay $25. For each hotel $100.',
    function (p, ctx) {
      if (ctx) {
        let cost = 0;
        for (let i = 0; i < 40; i++) {
          if (ctx.squares[i].owner === p.index) {
            if (ctx.squares[i].house === 5) cost += 100;
            else cost += ctx.squares[i].house * 25;
          }
        }
        p.money -= cost;
      }
    },
  );
  chanceCards[2] = new Card('Speeding fine $15.', function (p) {
    p.money -= 15;
  });
  chanceCards[3] = new Card(
    'You have been elected chairman of the board. Pay each player $50.',
    function (p, ctx) {
      if (ctx) {
        for (let i = 1; i <= ctx.pcount; i++) {
          if (i !== ctx.turn) {
            ctx.players[i].money += 50;
            p.money -= 50;
          }
        }
      }
    },
  );
  chanceCards[4] = new Card('Go back three spaces.', function (p) {
    p.position -= 3;
    if (p.position < 0) p.position += 40;
  });
  chanceCards[5] = new Card(
    'ADVANCE TO THE NEAREST UTILITY. IF UNOWNED, you may buy it from the Bank. IF OWNED, throw dice and pay owner a total ten times the amount thrown.',
    function (p) {
      if (p.position < 12) p.position = 12;
      else if (p.position < 28) p.position = 28;
      else {
        p.position = 12;
        p.money += 200;
      }
      p._landAgain = true;
      p._increasedRent = true;
    },
  );
  chanceCards[6] = new Card('Bank pays you dividend of $50.', function (p) {
    p.money += 50;
  });
  chanceCards[7] = new Card(
    'ADVANCE TO THE NEAREST RAILROAD. If UNOWNED, you may buy it from the Bank. If OWNED, pay owner twice the rental to which they are otherwise entitled.',
    function (p) {
      if (p.position < 15) p.position = 15;
      else if (p.position < 25) p.position = 25;
      else if (p.position < 35) p.position = 35;
      else {
        p.position = 5;
        p.money += 200;
      }
      p._landAgain = true;
      p._increasedRent = true;
    },
  );
  chanceCards[8] = new Card('Pay poor tax of $15.', function (p) {
    p.money -= 15;
  });
  chanceCards[9] = new Card(
    'Take a trip to Reading Rail Road. If you pass "GO" collect $200.',
    function (p) {
      if (p.position > 5) p.money += 200;
      p.position = 5;
      p._landAgain = true;
    },
  );
  chanceCards[10] = new Card('ADVANCE to Boardwalk.', function (p) {
    p.position = 39;
    p._landAgain = true;
  });
  chanceCards[11] = new Card(
    'ADVANCE to Illinois Avenue. If you pass "GO" collect $200.',
    function (p) {
      if (p.position > 24) p.money += 200;
      p.position = 24;
      p._landAgain = true;
    },
  );
  chanceCards[12] = new Card(
    'Your building loan matures. Collect $150.',
    function (p) {
      p.money += 150;
    },
  );
  chanceCards[13] = new Card(
    'ADVANCE TO THE NEAREST RAILROAD. If UNOWNED, you may buy it from the Bank. If OWNED, pay owner twice the rental to which they are otherwise entitled.',
    function (p) {
      if (p.position < 15) p.position = 15;
      else if (p.position < 25) p.position = 25;
      else if (p.position < 35) p.position = 35;
      else {
        p.position = 5;
        p.money += 200;
      }
      p._landAgain = true;
      p._increasedRent = true;
    },
  );
  chanceCards[14] = new Card(
    'ADVANCE to St. Charles Place. If you pass "GO" collect $200.',
    function (p) {
      if (p.position > 11) p.money += 200;
      p.position = 11;
      p._landAgain = true;
    },
  );
  chanceCards[15] = new Card(
    'Go to Jail. Go Directly to Jail. Do not pass "GO". Do not collect $200.',
    function (p) {
      p.jail = true;
      p.position = 10;
    },
  );

  return { square, communityChestCards, chanceCards };
}

export function classicCorrections() {
  return {
    cell1name: 'Mediter-ranean Avenue',
  };
}

export function classicUtiltext() {
  return 'If one "Utility" is owned rent is 4 times amount shown on dice. If both "Utilities" are owned rent is 10 times amount shown on dice.';
}

export function classicTranstext() {
  return 'Rent $25. | If 2 Railroads are owned $50. | If 3 are owned $100. | If 4 are owned $200.';
}
