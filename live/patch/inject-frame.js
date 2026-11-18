// Example mod body for: node build-length-aware.js --at game2-update --inject-file inject-frame.js
// Runs at the top of every game2.update() frame; proves the edited function is live.
window.__deadshotUpdateRuns = (window.__deadshotUpdateRuns || 0) + 1;
window.__deadshotModDetail = { build: "game2-update", note: "per-frame injection" };
