export function Square(
  name,
  pricetext,
  color,
  price,
  groupNumber,
  baserent,
  rent1,
  rent2,
  rent3,
  rent4,
  rent5,
) {
  this.name = name;
  this.pricetext = pricetext;
  this.color = color;
  this.owner = 0;
  this.mortgage = false;
  this.house = 0;
  this.hotel = 0;
  this.groupNumber = groupNumber || 0;
  this.price = price || 0;
  this.baserent = baserent || 0;
  this.rent1 = rent1 || 0;
  this.rent2 = rent2 || 0;
  this.rent3 = rent3 || 0;
  this.rent4 = rent4 || 0;
  this.rent5 = rent5 || 0;
  this.landcount = 0;

  if (groupNumber === 3 || groupNumber === 4) {
    this.houseprice = 50;
  } else if (groupNumber === 5 || groupNumber === 6) {
    this.houseprice = 100;
  } else if (groupNumber === 7 || groupNumber === 8) {
    this.houseprice = 150;
  } else if (groupNumber === 9 || groupNumber === 10) {
    this.houseprice = 200;
  } else {
    this.houseprice = 0;
  }
}

export function Card(text, action) {
  this.text = text;
  this.action = action;
}

export function Player(name, color) {
  this.name = name;
  this.color = color;
  this.position = 0;
  this.money = 1500;
  this.creditor = -1;
  this.jail = false;
  this.jailroll = 0;
  this.communityChestJailCard = false;
  this.chanceJailCard = false;
  this.bidding = true;
  this.human = true;
  this.index = 0;

  this.pay = function (amount, creditor) {
    if (amount <= this.money) {
      this.money -= amount;
      return true;
    } else {
      this.money -= amount;
      this.creditor = creditor;
      return false;
    }
  };
}

export function Trade(
  initiator,
  recipient,
  money,
  property,
  communityChestJailCard,
  chanceJailCard,
) {
  this.getInitiator = function () {
    return initiator;
  };
  this.getRecipient = function () {
    return recipient;
  };
  this.getProperty = function (index) {
    return property[index];
  };
  this.getMoney = function () {
    return money;
  };
  this.getCommunityChestJailCard = function () {
    return communityChestJailCard;
  };
  this.getChanceJailCard = function () {
    return chanceJailCard;
  };
}
