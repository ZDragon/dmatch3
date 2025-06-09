const logActions = [];

function logAction(action) {
    const timestamp = new Date().toISOString();
    logActions.push({ action, timestamp });
    console.log(`[${timestamp}] Action: ${action}`);
}

function getLog() {
    return logActions;
}

function clearLog() {
    logActions.length = 0;
}

module.exports = { logAction, getLog, clearLog };