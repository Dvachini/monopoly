import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from 'react';
import { classicEdition } from '../data/classicedition.jsx';
import { newYorkCityEdition } from '../data/newyorkcityedition.jsx';
import { AITest } from '../game/ai.jsx';

const GameContext = createContext();

export function useGame() {
  return useContext(GameContext);
}

export function GameProvider({ children }) {
  const [status, setStatus] = useState('lobby'); // lobby | setup | playing | finished
  const [players, setPlayers] = useState([]);
  const [squares, setSquares] = useState([]);
  const [turn, setTurn] = useState(0);
  const [pcount, setPcount] = useState(0);
  const [doublecount, setDoublecount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [popupData, setPopupData] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [deedIndex, setDeedIndex] = useState(-1);
  const [showTrade, setShowTrade] = useState(false);
  const [edition, setEdition] = useState('classic');
  const [communityChestCards, setCommunityChestCards] = useState([]);
  const [chanceCards, setChanceCards] = useState([]);
  const [die1, setDie1] = useState(0);
  const [die2, setDie2] = useState(0);
  const [diceRolled, setDiceRolled] = useState(false);
  const [landed, setLanded] = useState('');
  const [showBoard, setShowBoard] = useState(false);
  const [showControl, setShowControl] = useState(false);
  const [showMoneyBar, setShowMoneyBar] = useState(false);
  const [activeTab, setActiveTab] = useState('buy'); // buy | manage

  // Auction state
  const [auctionProperty, setAuctionProperty] = useState(null); // square index being auctioned
  const [auctionBid, setAuctionBid] = useState(0); // current highest bid
  const [auctionBidder, setAuctionBidder] = useState(0); // player index of highest bidder
  const [auctionTurn, setAuctionTurn] = useState(0); // which player is currently bidding
  const [auctionActive, setAuctionActive] = useState(false); // is auction in progress
  const [auctionPlayers, setAuctionPlayers] = useState([]); // players still in the auction
  const [auctionEndTurnPending, setAuctionEndTurnPending] = useState(false); // auto-advance turn after auction

  // Refs for mutable game state (needed for callbacks/closures)
  const gameRef = useRef({
    players: [],
    squares: [],
    turn: 0,
    pcount: 0,
    doublecount: 0,
    die1: 0,
    die2: 0,
    communityChestCards: [],
    chanceCards: [],
  });

  const addAlert = useCallback((text) => {
    setAlerts((prev) => [...prev, text]);
  }, []);

  const popup = useCallback((html, action, option) => {
    setPopupData({ html, action, option });
  }, []);

  const closePopup = useCallback(() => {
    setPopupData(null);
  }, []);

  const value = {
    status,
    setStatus,
    players,
    setPlayers,
    squares,
    setSquares,
    turn,
    setTurn,
    pcount,
    setPcount,
    doublecount,
    setDoublecount,
    alerts,
    setAlerts,
    popupData,
    setPopupData,
    showStats,
    setShowStats,
    deedIndex,
    setDeedIndex,
    showTrade,
    setShowTrade,
    edition,
    setEdition,
    communityChestCards,
    setCommunityChestCards,
    chanceCards,
    setChanceCards,
    die1,
    setDie1,
    die2,
    setDie2,
    diceRolled,
    setDiceRolled,
    landed,
    setLanded,
    showBoard,
    setShowBoard,
    showControl,
    setShowControl,
    showMoneyBar,
    setShowMoneyBar,
    activeTab,
    setActiveTab,
    auctionProperty,
    setAuctionProperty,
    auctionBid,
    setAuctionBid,
    auctionBidder,
    setAuctionBidder,
    auctionTurn,
    setAuctionTurn,
    auctionActive,
    setAuctionActive,
    auctionPlayers,
    setAuctionPlayers,
    auctionEndTurnPending,
    setAuctionEndTurnPending,
    gameRef,
    addAlert,
    popup,
    closePopup,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export default GameContext;
