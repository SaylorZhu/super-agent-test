import "./style.css";
import { Game } from "./game/Game.js";

const canvas = document.getElementById("game-canvas");

if (canvas) {
  new Game(canvas);
}
