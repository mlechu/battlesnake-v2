const h = require("./helpers");

function info() {
  console.log("INFO")
  const response = {
    apiversion: "1",
    author: "",
    color: "#F88888",
    head: "caffeine",
    tail: "mouse"
  }
  return response
}

function start(gameState) {
  console.log(`${gameState.game.id} START`)
}

function end(gameState) {
  console.log(`${gameState.game.id} END\n`)
}

function move(gameState) {
  let possibleMoves = {
    up: true,
    down: true,
    left: true,
    right: true
  };

  // Step 0: Don't let your Battlesnake move back on its own neck
  const myHead = gameState.you.head;
  const myNeck = gameState.you.body[1];
  if (!h.same(myHead, myNeck)) possibleMoves[h.toDir(myHead, myNeck)] = false;


  // Step 1 - Don't hit walls.
  const boardWidth = gameState.board.width;
  const boardHeight = gameState.board.height;
  possibleMoves = avoidWall(boardWidth, boardHeight, myHead, possibleMoves);

  // Step 2 - Don't hit yourself
  const myBody = gameState.you.body;
  const health = gameState.you.health;
  possibleMoves = avoidBody(myBody, myHead, possibleMoves, health);

  // Step ? - Put everything on a map
  // TODO: Step 3 - Don't collide with others.
  // TODO: Step 4 - Find food.
  const gameBoard = generateGameBoard(gameState.board, gameState.you, gameState.turn);
  const moveScores = Object.keys(possibleMoves).reduce((mss, mv) => {
    const destination = h.go[mv](gameState.you.head);
    return {...mss, [mv]: possibleMoves[mv] ? gameBoard[destination.x][destination.y] : -100 }
  },
  {});

  console.log('moveScores:')
  console.log(moveScores);
  // const bestMove = Object.keys(moveScores).reduce((best, mv) => moveScores[mv] > moveScores[best] ? mv : best);
  const bestScore = Math.max(...Object.values(moveScores));
  let bestMoves = {};
  
  // true for all moves with the highest tied score
  for (let dir in moveScores) {
    bestMoves[dir] = moveScores[dir] === bestScore;
  }

  possibleMoves = chaseTail(myBody, myHead, bestMoves, health, gameState.turn)

  const safeMoves = Object.keys(possibleMoves).filter(key => possibleMoves[key]);
  const response = {
    move: safeMoves[Math.floor(Math.random() * safeMoves.length)] || 'right',
  }

  console.log(`${gameState.game.id} MOVE ${gameState.turn}: ${response.move}`)
  // console.log(`Food:${gameState.you.health}, PossibleMoves: ` + safeMoves)
  return response
}

const BFLAGS = {
  kill: 29, // smallsnake head

  food: 11, 
  toFood: 18, // probably unused

  open: 13, // floodfill best area
  tail: 12,
  marked: 1, 
  idk: 0, // not yet visited by floodfill
  
  discourage: -1,
  maybeDeath: -9, // head

  trapped: -18, // finna die
  death: -19, // other snake, fedsnake tail
};

/**
 * @param {Board} board: https://docs.battlesnake.com/references/api#board
 * @returns {number[][]} according to BFLAGS
 */
function generateGameBoard(board, you, turn) {
  let newBoard = new Array(board.height)
    .fill(BFLAGS.idk)
    .map(_ => new Array(board.width).fill(BFLAGS.idk));

  // Encourage food
  board.food.forEach(f => {
    if (you.health < 80) newBoard[f.x][f.y] = BFLAGS.food;
    if (you.health < 10) newBoard[f.x][f.y] = BFLAGS.food + 2;
  });
  
  // Disallow running into snakes
  board.snakes.forEach((otherSnake, s_idx) => {
    /** @type {boolean} */
    const eatThisGuy = otherSnake.length < you.length;
    /** { up: {3, 3}, down: {3, 1}, ... } */
    const next = h.moves(otherSnake.head);

    // Handle potential next head moves (exempt yourself)
    if (!h.same(otherSnake.head, you.head)) {
      /** @type {string} */
      for (const possibleMove in next) {
        if (!inBounds(newBoard, next[possibleMove].x, next[possibleMove].y)) continue;
        newBoard[next[possibleMove].x][next[possibleMove].y] = eatThisGuy? BFLAGS.kill : BFLAGS.maybeDeath;
      }
    }

    otherSnake.body.forEach((pt, pt_idx) => {
      const tailAndSafe = (
        pt_idx === otherSnake.length - 1 // this is the tail
        && otherSnake.health < 100 // they didn't just eat
        && newBoard[pt.x][pt.y] >= BFLAGS.maybeDeath // not already marked death
      );
      newBoard[pt.x][pt.y] = tailAndSafe ? Math.min((newBoard[pt.x][pt.y] || BFLAGS.tail), BFLAGS.tail) : BFLAGS.death;
    });
  });

  // Don't trap yourself
  const ffCandidates = h.moves(you.head);
  let ffResults = {}
  for (let ffc in ffCandidates) {
    if (
      inBounds(newBoard, ffCandidates[ffc].x, ffCandidates[ffc].y) 
      && newBoard[ffCandidates[ffc].x][ffCandidates[ffc].y] > BFLAGS.maybeDeath
    ) {
      ffResults[ffc] = floodfillR(copyMatrix(newBoard), [ffCandidates[ffc]], 1);

      // Rather chase tail than enter a tight space
      if (newBoard[ffCandidates[ffc].x][ffCandidates[ffc].y] === BFLAGS.tail) {
        ffResults[ffc] = you.length + 1; // kinda arbitrary number
      }
    }
  }

  // console.log(ffResults);
  const bestScore = Math.max(...Object.values(ffResults));
  
  for (let ffr in ffResults) {
    if (ffResults[ffr] === bestScore) {
      const bestSpot = h.go[ffr](you.head);
      newBoard[bestSpot.x][bestSpot.y] += BFLAGS.open;
    }
  }

  // Discourage edges of the board
  // terrible code LOL idc it's 1am pacific
  newBoard.forEach(col => {
    col[0] += BFLAGS.discourage;
    col[col.length - 1] += BFLAGS.discourage;
  });
  newBoard[0].forEach((point, idx) => {
    newBoard[0][idx] += BFLAGS.discourage;
    newBoard[newBoard.length - 1][idx] += BFLAGS.discourage;
  });
  // // Discourage edges of the board
  // // terrible code LOL idc it's 1am pacific
  // newBoard.forEach(col => {
  //     col[0]              = Math.min(col[0], BFLAGS.discourage);
  //     col[col.length - 1] = Math.min(col[col.length - 1], BFLAGS.discourage);
  // })
  // newBoard[0].forEach((point, idx) => {
  //     newBoard[0][idx] = Math.min(newBoard[0][idx], BFLAGS.discourage);
  //     newBoard[newBoard.length - 1][idx] = Math.min(newBoard[newBoard.length - 1][idx], BFLAGS.discourage);
  // })
  
  return newBoard;
}

function copyMatrix(m) {
  return m.map(mcol => [...mcol]);
}

/**
 * @returns number of non-visited points floodfillable from this one
 */
function floodfillR(map, queue, soFar) {
  const curr = queue.shift();
  // console.log(curr)
  // console.log(map)
  // console.log(queue)
  // console.log(soFar)
  map[curr.x][curr.y] = BFLAGS.marked;
  const neighbors = h.moves(curr);
  for (const dir in neighbors) {
    if (
      inBounds(map, neighbors[dir].x, neighbors[dir].y) 
      && map[neighbors[dir].x][neighbors[dir].y] > BFLAGS.maybeDeath
      && map[neighbors[dir].x][neighbors[dir].y] !== BFLAGS.marked
    ) {
      const spot = map[neighbors[dir].x][neighbors[dir].y];
      queue.push(neighbors[dir]);
      map[neighbors[dir].x][neighbors[dir].y] = spot === 0? BFLAGS.marked : Math.min(spot, BFLAGS.marked);
    }
  }

  return queue.length ? floodfillR(map, queue, soFar + 1) : soFar;
}

/** 
 * avoid errors
 */
function inBounds(matrix, x, y) {
  return (
    x >= 0
    && y >=0
    && x < matrix.length
    && y < matrix[0].length
  );
}


// Please contact Pierre if there's something wrong :)
// Avoids walls...
function avoidWall(boardWidth, boardHeight, myHead, possibleMoves) {
  let myHeadX = myHead.x;
  let myHeadY = myHead.y;
  //console.log("(X,Y): " + "(" + myHeadX + "," + myHeadY + ")");
  //console.log("Dimensions: " + boardHeight + "," + boardWidth);

  if( (myHeadY + 1) >= (boardHeight) ) {
  possibleMoves.up = false;
  }
  if( (myHeadY - 1) < (0) ) {
  possibleMoves.down = false;
  }
  if( (myHeadX - 1) < (0) ) {
  possibleMoves.left = false;
  }
  if( (myHeadX + 1) >= (boardWidth) ) {
  possibleMoves.right = false;
  }

  return possibleMoves;
}

// Please contact Pierre if there's something wrong :)
// Avoids collison with self...
function avoidBody(myBody, myHead, possibleMoves, food) {
  let myHeadX = myHead.x;
  let myHeadY = myHead.y;

  for(let i = 0; i < myBody.length; i++) {
  let currBodyX = myBody[i].x;
  let currBodyY = myBody[i].y;

  // If we are looking at our tail, we can move onto it... Unless we just ate
  if( (i == myBody.length - 1) && (food != 100) ) {
    continue;
  } 

  if( (myHeadX) == (currBodyX)  && (myHeadY + 1) == (currBodyY) ) {
    possibleMoves.up = false;
  }
  if( (myHeadX) == (currBodyX)  && (myHeadY - 1) == (currBodyY) ) {
    possibleMoves.down = false;
  }
  if( (myHeadX - 1) == (currBodyX)  && (myHeadY) == (currBodyY) ) {
    possibleMoves.left = false;
  }
  if( (myHeadX + 1) == (currBodyX)  && (myHeadY) == (currBodyY) ) {
    possibleMoves.right = false;
  }
  }

  return possibleMoves;
}

// Please contact Pierre if there's something wrong :)
// Chases tail, sets non-relevant values to false
// If food < x it stops chasing
function chaseTail(myBody, myHead, possibleMoves, food, turn) {
  myHeadX = myHead.x;
  myHeadY = myHead.y;
  
  myTailX = myBody[myBody.length - 1].x;
  myTailY = myBody[myBody.length - 1].y;

  if(food < 40 || turn < 15) {
  return possibleMoves;
  }

  var tempArray = [];
  if( possibleMoves.up == true && (myHeadY - myTailY) < 0 ) { // True if tail is above head
  tempArray.push("up");
  } if( possibleMoves.left == true && (myHeadX - myTailX) > 0 ) { // True if tail is left of head
  tempArray.push("left");
  } if ( possibleMoves.down == true && (myHeadY - myTailY) > 0 ) { // True if tail is below head
  tempArray.push("down");
  } if ( possibleMoves.right == true && (myHeadX - myTailX) < 0 ) { // True if tail is right of head
  tempArray.push("right");
  }

  if(tempArray.length > 0) {
  possibleMoves.up = false; possibleMoves.down = false; possibleMoves.left = false; possibleMoves.right = false;
  if(tempArray.includes("up")) {
    possibleMoves.up = true;
  }
  if(tempArray.includes("right")) {
    possibleMoves.right = true;
  }
  if(tempArray.includes("down")) {
    possibleMoves.down = true;
  }
  if(tempArray.includes("left")) {
    possibleMoves.left = true;
  }
  }
  
  return possibleMoves;
}


module.exports = {
  info: info,
  start: start,
  move: move,
  end: end
}