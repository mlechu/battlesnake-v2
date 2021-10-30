/**
 * @typedef Point
 * @description yeah vectors and points are different but it's late and i dont care !!! everything's a point now
 * @property {number} x
 * @property {number} y
 */


/**
 * Point constructor
 * @param {number} x
 * @param {number} y
 * @returns {Point}
 */
const p = (x, y) => ({x, y});

const directions = ['up', 'right', 'down', 'left'];

const vector = {
  up: p(0, 1),
  right: p(1, 0),
  down: p(0, -1),
  left: p(-1, 0),
};

/**
 * Inverse of vector
 * @example vector[fromVector(v)] === v
 * @example fromVector(vector[dir]) === dir
 * 
 * @param {Point} vec
 * @returns {"up"|"right"|"down"|"left"}
 */
function fromVector(vec) {
  if (same(vector.up, vec)) return "up";
  if (same(vector.right, vec)) return "right";
  if (same(vector.down, vec)) return "down";
  if (same(vector.left, vec)) return "left";

  console.error('ERROR: fromVector recieved something that isn\'t a unit vector');
  console.log(vec);
  return "up";
}

function add(point, vector) {
  return {
    x: point.x + vector.x,
    y: point.y + vector.y,
  };
}

/**
 * Calculate B - A, or travel needed to get A->B
 * @param {Point} pointA
 * @param {Point} pointB
 * @returns {Point | false} 
 */
function diff(pointA, pointB) {
  return !same(pointA, pointB) && {
    x: pointB.x - pointA.x,
    y: pointB.y - pointA.y,
  };
}

/** 
 * @param {Point} pointA
 * @param {Point} pointB
 * @returns {boolean}
 */
function same(pointA, pointB) {
  return pointA.x === pointB.x && pointA.y === pointB.y;
}

const go = {
  /** @param {Point} point @returns {Point} */
  up: start => add(start, vector.up),
  right: start => add(start, vector.right),
  down: start => add(start, vector.down),
  left: start => add(start, vector.left),
};

const moves = (start) => ({
  up: go.up(start),
  right: go.right(start),
  down: go.down(start),
  left: go.left(start),
});

/** 
 * A->B is what direction?
 * @returns {"up" | "right" | "down" | "left"}
 */
function toDir(pointA, pointB) {
  return fromVector(diff(pointA, pointB));
}

module.exports = {
  p,
  directions,
  vector,
  fromVector,
  add,
  diff,
  same,
  go,
  moves,
  toDir
}