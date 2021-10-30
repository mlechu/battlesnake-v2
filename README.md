## Battlesnake v2: i don't know how to use computer
A bit of last-minute code that won the [RBC Fall battlesnake tournament](https://play.battlesnake.com/competitions/rbc-fall-tournament/rbc-fall-tournament/brackets/)! 

This snake is pretty defensive. Good at eating just enough to survive while staying short and nimble, bad at escaping attacks that are hard to detect with floodfill (e.g. the approaching head of another snake). Luckily, all the participants of this tournament are busy interns that have better things to do than outsmart a floodfiller snake.

## How moves are chosen
1. Above all else, avoid certain death by walls or running into self/others
2. If floodfill gives different results for different moves, getting trapped is possible, so always select the largest area
    - Isn't always the best choice—one area may have a head and the other may have a tail—but 99% of the time it is.
    - Floodfill will properly consider a tail space to be a large-ish empty area
3. If a collision with a smaller snake is possible in a move, go for it
    - This didn't really happen in practice—the food logic is very conservative, so less opportunity for aggression
4. If eating food is possible in a move and your health is below a threshold, go for it
5. Avoid the outer rim of the board
    - This prevents getting "squeezed out" in certain situations at the cost of letting others escape the squeeze
6. If there's nothing else to do AND health is above a threshold, just tail-chase (logic implemented by Pierre)

Here are the rough weightings used for each possible move:
```js
const BFLAGS = {
  kill: 29, // Potential collision with a smaller snake than itself

  food: 11, 

  open: 13, // floodfill best area
  tail: 12, // The tail of a snake that has not just eaten
  marked: 1, // visited by floodfill
  idk: 0, // not yet visited by floodfill
  
  discourage: -1, // used to discourage hitting the edges of the board. see above
  maybeDeath: -9, // head

  death: -19, // other snake, fedsnake tail
};
```