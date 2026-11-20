export function createGameEventSender() {
  let announced = false;
  return {
    reset() { announced = false; },
    announce({status, campaignWon, playerName}, send) {
      const type = status === 'lost' ? 'death' : status === 'won' && campaignWon ? 'victory' : null;
      if (!type || !playerName || announced) return false;
      announced = true;
      return send({type, player: playerName});
    },
  };
}
