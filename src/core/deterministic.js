import seedrandom from 'seedrandom';
let rng;

export function setSeed(seed) {
    rng = seedrandom(seed);
}

export function getRandom(min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
}