const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

io.on("connection", (uniquesocket) => {
  console.log("A user connected:", uniquesocket.id);

  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w");
    
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
  } else {
    uniquesocket.emit("spectatorRole");
  }

  uniquesocket.on("disconnect", () => {
    if (uniquesocket.id === players.white) {
      delete players.white;
      console.log("White player disconnected.");
    } else if (uniquesocket.id === players.black) {
      delete players.black;
      console.log("Black player disconnected.");
    }
  });

  uniquesocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
      if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

      const result = chess.move(move);
      if (result) {
        currentPlayer = chess.turn();
        io.emit("boardState", chess.fen());
        
        // Check for game over conditions
        if (chess.isGameOver()) {
            let message = "";
            if (chess.isCheckmate()) {
                message = `Checkmate! ${currentPlayer === 'w' ? 'Black' : 'White'} wins!`;
            } else if (chess.isDraw()) {
                message = "The game is a draw.";
            } else if (chess.isStalemate()) {
                message = "Stalemate! The game is a draw.";
            } else if (chess.isThreefoldRepetition()) {
                message = "The game is a draw by threefold repetition.";
            } else if (chess.isInsufficientMaterial()) {
                message = "The game is a draw due to insufficient material.";
            }
            io.emit("gameOver", message);
        }
      } else {
        console.log("Invalid move: ", move);
        uniquesocket.emit("invalidMove", move);
      }
    } catch (error) {
      console.log(error);
      uniquesocket.emit("invalidMove", move);
    }
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});