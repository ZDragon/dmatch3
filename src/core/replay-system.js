let replayData = [];

export function recordAction(action) {
    replayData.push(action);
}

export function playReplay(gameState, actions) {
    actions.forEach(action => {
        simulateUserMove(gameState, action.x, action.y);
    });
}