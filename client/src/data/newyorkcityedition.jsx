import { Square, Card } from '../game/models.jsx';

export function newYorkCityEdition() {
  const square = [];

  square[0] = new Square('GO', 'COLLECT $200 SALARY AS YOU PASS.', 'white');
  square[1] = new Square(
    'Port Authority Bus Terminal',
    '$60',
    '#4B0082',
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
    'white',
  );
  square[3] = new Square(
    'Lincoln Tunnel',
    '$60',
    '#4B0082',
    60,
    3,
    4,
    20,
    60,
    180,
    320,
    450,
  );
  square[4] = new Square('City Tax', 'PAY 10% OR $200', 'white');
  square[5] = new Square('LOMTO', '$200', 'white', 200, 1);
  square[6] = new Square(
    'Statue of Liberty',
    '$100',
    '#AACCFF',
    100,
    4,
    6,
    30,
    90,
    270,
    400,
    550,
  );
  square[7] = new Square('Chance', 'NEW YORK LOTTERY GAMES', 'white');
  square[8] = new Square(
    'Empire State Building',
    '$100',
    '#AACCFF',
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
    'Central Park',
    '$120',
    '#AACCFF',
    120,
    4,
    8,
    40,
    100,
    300,
    450,
    600,
  );
  square[10] = new Square('Just Visiting', '', 'white');
  square[11] = new Square(
    '98.7 Kiss FM',
    '$140',
    'purple',
    140,
    5,
    10,
    50,
    150,
    450,
    625,
    750,
  );
  square[12] = new Square('Con Edison Electric', '$150', 'white', 150, 2);
  square[13] = new Square(
    'Thirteen WNET',
    '$140',
    'purple',
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
    'The New York Times',
    '$160',
    'purple',
    160,
    5,
    12,
    60,
    180,
    500,
    700,
    900,
  );
  square[15] = new Square('New York City Transit', '$200', 'white', 200, 1);
  square[16] = new Square(
    'New York Rangers',
    '$180',
    'orange',
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
    'white',
  );
  square[18] = new Square(
    'New York Knicks',
    '$180',
    'orange',
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
    'Madison Square Garden',
    '$200',
    'orange',
    200,
    6,
    16,
    80,
    220,
    600,
    800,
    1000,
  );
  square[20] = new Square('Free Parking', '', 'white');
  square[21] = new Square(
    'macy*s',
    '$220',
    'red',
    220,
    7,
    18,
    90,
    250,
    700,
    875,
    1050,
  );
  square[22] = new Square('Chance', 'NEW YORK LOTTERY GAMES', 'white');
  square[23] = new Square(
    'FAO Schwarz',
    '$220',
    'red',
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
    "bloomingdale's",
    '$240',
    'red',
    240,
    7,
    20,
    100,
    300,
    750,
    925,
    1100,
  );
  square[25] = new Square('Metro-North Railroad', '$200', 'white', 200, 1);
  square[26] = new Square(
    'Deloitte & Touche LLP',
    '$260',
    'yellow',
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
    'SmithBarney',
    '$260',
    'yellow',
    260,
    8,
    22,
    110,
    330,
    800,
    975,
    1150,
  );
  square[28] = new Square('Con Edison Gas', '$150', 'white', 150, 2);
  square[29] = new Square(
    'CITIBANK',
    '$280',
    'yellow',
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
    'white',
  );
  square[31] = new Square(
    'The Regency Hotel',
    '$300',
    'green',
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
    'Essex House',
    '$300',
    'green',
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
    'white',
  );
  square[34] = new Square(
    'The Plaza',
    '$320',
    'green',
    320,
    9,
    28,
    150,
    450,
    1000,
    1200,
    1400,
  );
  square[35] = new Square('United Airlines', '$200', 'white', 200, 1);
  square[36] = new Square('Chance', 'NEW YORK LOTTERY GAMES', 'white');
  square[37] = new Square(
    'Tiffany & CO.',
    '$350',
    'blue',
    350,
    10,
    35,
    175,
    500,
    1100,
    1300,
    1500,
  );
  square[38] = new Square('LUXURY TAX', 'Pay $75', 'white');
  square[39] = new Square(
    'TRUMP TOWER',
    '$400',
    'blue',
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
    'You have won lifetime home delivery of the New York Times. Collect $10',
    function (p) {
      p.money += 10;
    },
  );
  communityChestCards[2] = new Card(
    "From sale of Macy's stock, you get $45",
    function (p) {
      p.money += 45;
    },
  );
  communityChestCards[3] = new Card(
    'Life insurance matures. Collect $100',
    function (p) {
      p.money += 100;
    },
  );
  communityChestCards[4] = new Card(
    'Deloitte & Touche LLP tax return Collect $20',
    function (p) {
      p.money += 20;
    },
  );
  communityChestCards[5] = new Card(
    'FAO Schwarz Xmas fund matures. Collect $100',
    function (p) {
      p.money += 100;
    },
  );
  communityChestCards[6] = new Card(
    'You have won a United Airlines trip around the world! Collect $100',
    function (p) {
      p.money += 100;
    },
  );
  communityChestCards[7] = new Card(
    'Performed a wedding at the Plaza Hotel. Receive $25',
    function (p) {
      p.money += 25;
    },
  );
  communityChestCards[8] = new Card('Pay hospital $100', function (p) {
    p.money -= 100;
  });
  communityChestCards[9] = new Card(
    'You won the Lottery! Collect $200',
    function (p) {
      p.money += 200;
    },
  );
  communityChestCards[10] = new Card('Pay school tax of $150', function (p) {
    p.money -= 150;
  });
  communityChestCards[11] = new Card("Doctor's fee. Pay $50", function (p) {
    p.money -= 50;
  });
  communityChestCards[12] = new Card(
    'Madison Square Garden opening tonight. Collect $50 from every player for opening night seats.',
    function (p, ctx) {
      if (ctx) {
        for (let i = 1; i <= ctx.pcount; i++) {
          if (i !== ctx.turn) {
            ctx.players[i].money -= 50;
            p.money += 50;
          }
        }
      }
    },
  );
  communityChestCards[13] = new Card(
    'You have won kiss cash! Advance to GO (Collect $200)',
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
    'Go to Jail. Go directly to Jail. Do not pass GO. Do not collect $200.',
    function (p) {
      p.jail = true;
      p.position = 10;
    },
  );

  const chanceCards = [];
  chanceCards[0] = new Card(
    'Get out of Jail free. This card may be kept until needed or sold.',
    function (p) {
      p.chanceJailCard = true;
    },
  );
  chanceCards[1] = new Card(
    'Make general repairs on all your property. For each house pay $25. For each hotel $100.',
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
  chanceCards[2] = new Card('Pay poor tax of $15.', function (p) {
    p.money -= 15;
  });
  chanceCards[3] = new Card(
    'You have been elected chairman of Con Edison. Pay each player $50.',
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
  chanceCards[4] = new Card('Go back 3 spaces.', function (p) {
    p.position -= 3;
    if (p.position < 0) p.position += 40;
  });
  chanceCards[5] = new Card(
    'Advance token to the nearest Con Edison utility. If UNOWNED you may buy it from the bank. If OWNED, throw dice and pay owner a total of ten times the amount thrown.',
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
  chanceCards[6] = new Card('Citibank pays you interest of $50.', function (p) {
    p.money += 50;
  });
  chanceCards[7] = new Card(
    'Advance token to the nearest Transportation and pay owner Twice the Rental to which they are otherwise entitled. If Transportation is unowned, you may buy it from the Bank.',
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
  chanceCards[8] = new Card(
    'Take a walk past The Essex House. Advance to GO. Collect $200.',
    function (p) {
      p.position = 0;
      p.money += 200;
    },
  );
  chanceCards[9] = new Card(
    'Take a ride to the Regency Hotel! If you pass GO collect $200.',
    function (p) {
      if (p.position > 31) p.money += 200;
      p.position = 31;
      p._landAgain = true;
    },
  );
  chanceCards[10] = new Card(
    'Take a walk on fifth avenue. Advance token to Trump Tower.',
    function (p) {
      p.position = 39;
      p._landAgain = true;
    },
  );
  chanceCards[11] = new Card('Advance to thirteen.', function (p) {
    if (p.position > 13) p.money += 200;
    p.position = 13;
    p._landAgain = true;
  });
  chanceCards[12] = new Card(
    'Your Smith Barney mutual fund pays dividend. Collect $150.',
    function (p) {
      p.money += 150;
    },
  );
  chanceCards[13] = new Card(
    'Advance token to the nearest Transportation and pay owner Twice the Rental to which they are otherwise entitled. If Transportation is unowned, you may buy it from the Bank.',
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
    'Catch a bus to Central Park. If you pass GO, collect $200.',
    function (p) {
      if (p.position > 9) p.money += 200;
      p.position = 9;
      p._landAgain = true;
    },
  );
  chanceCards[15] = new Card(
    'Go directly to Jail. Do not pass GO, do not collect $200.',
    function (p) {
      p.jail = true;
      p.position = 10;
    },
  );

  return { square, communityChestCards, chanceCards };
}

export function nycCorrections() {
  return {
    cell24name: 'blooming...',
  };
}

export function nycUtiltext() {
  return 'If one "Utility" is owned rent is 4 times amount shown on dice. If both "Utilities" are owned rent is 10 times amount shown on dice.';
}

export function nycTranstext() {
  return 'Rent $25. | If 2 Transportations are owned $50. | If 3 are owned $100. | If 4 are owned $200.';
}
