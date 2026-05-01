import { Trade } from './models.jsx';

export function AITest(p, squareRef, playerRef, pcountRef, turnRef, gameRef) {
  this.alertList = '';

  this.constructor.count = (this.constructor.count || 0) + 1;
  p.name = 'AI Test ' + this.constructor.count;

  this.buyProperty = function (index) {
    var s = squareRef[index];
    if (p.money > s.price + 50) {
      return true;
    }
    return false;
  };

  this.acceptTrade = function (tradeObj) {
    var tradeValue = 0;
    var money = tradeObj.getMoney();
    var initiator = tradeObj.getInitiator();
    var recipient = tradeObj.getRecipient();
    var property = [];

    tradeValue += 10 * tradeObj.getCommunityChestJailCard();
    tradeValue += 10 * tradeObj.getChanceJailCard();
    tradeValue += money;

    for (var i = 0; i < 40; i++) {
      property[i] = tradeObj.getProperty(i);
      tradeValue +=
        tradeObj.getProperty(i) *
        squareRef[i].price *
        (squareRef[i].mortgage ? 0.5 : 1);
    }

    var proposedMoney = 25 - tradeValue + money;

    if (tradeValue > 25) {
      return true;
    } else if (tradeValue >= -50 && initiator.money > proposedMoney) {
      return new Trade(
        initiator,
        recipient,
        proposedMoney,
        property,
        tradeObj.getCommunityChestJailCard(),
        tradeObj.getChanceJailCard(),
      );
    }

    return false;
  };

  this.beforeTurn = function () {
    var s;
    var allGroupOwned;
    var max;
    var leastHouseProperty;
    var leastHouseNumber;

    for (var i = 0; i < 40; i++) {
      s = squareRef[i];

      if (s.owner === p.index && s.groupNumber >= 3) {
        max = s.group.length;
        allGroupOwned = true;
        leastHouseNumber = 6;

        for (var j = max - 1; j >= 0; j--) {
          if (squareRef[s.group[j]].owner !== p.index) {
            allGroupOwned = false;
            break;
          }
          if (squareRef[s.group[j]].house < leastHouseNumber) {
            leastHouseProperty = squareRef[s.group[j]];
            leastHouseNumber = leastHouseProperty.house;
          }
        }

        if (!allGroupOwned) continue;
        if (p.money > leastHouseProperty.houseprice + 100) {
          // buyHouse would be called here via gameRef
        }
      }
    }

    for (var i = 39; i >= 0; i--) {
      s = squareRef[i];
      if (s.owner === p.index && s.mortgage && p.money > s.price) {
        // unmortgage would be called here via gameRef
      }
    }

    return false;
  };

  this.onLand = function () {
    return false;
  };

  this.postBail = function () {
    if ((p.communityChestJailCard || p.chanceJailCard) && p.jailroll === 2) {
      return true;
    }
    return false;
  };

  this.payDebt = function () {
    for (var i = 39; i >= 0; i--) {
      var s = squareRef[i];
      if (s.owner === p.index && !s.mortgage && s.house === 0) {
        // mortgage would be called here via gameRef
      }
      if (p.money >= 0) return;
    }
  };

  this.bid = function (property, currentBid) {
    var bid = currentBid + Math.round(Math.random() * 20 + 10);
    if (p.money < bid + 50 || bid > squareRef[property].price * 1.5) {
      return -1;
    }
    return bid;
  };
}

AITest.count = 0;
