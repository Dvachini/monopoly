const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, required: true },
  position: { type: Number, default: 0 },
  money: { type: Number, default: 1500 },
  jail: { type: Boolean, default: false },
  jailroll: { type: Number, default: 0 },
  communityChestJailCard: { type: Boolean, default: false },
  chanceJailCard: { type: Boolean, default: false },
  human: { type: Boolean, default: true },
});

const squareSchema = new mongoose.Schema({
  index: Number,
  name: String,
  owner: { type: Number, default: 0 },
  mortgage: { type: Boolean, default: false },
  house: { type: Number, default: 0 },
  hotel: { type: Number, default: 0 },
});

const gameSchema = new mongoose.Schema(
  {
    players: [playerSchema],
    squares: [squareSchema],
    turn: { type: Number, default: 1 },
    doublecount: { type: Number, default: 0 },
    edition: { type: String, default: 'classic' },
    status: {
      type: String,
      enum: ['setup', 'playing', 'finished'],
      default: 'setup',
    },
    winner: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Game', gameSchema);
