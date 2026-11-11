import { PLAYER } from "./constants.js";

function formatScore(score) {
  return String(Math.max(0, Math.floor(score))).padStart(5, "0");
}

export class UI {
  constructor({ onStart, onResume, onQuit, onMenu, onPause, onMute }) {
    this.handlers = { onStart, onResume, onQuit, onMenu, onPause, onMute };

    this.hud = document.getElementById("hud");
    this.menu = document.getElementById("menu");
    this.pauseScreen = document.getElementById("pause");
    this.gameoverScreen = document.getElementById("gameover");
    this.warning = document.getElementById("warning");
    this.toastElement = document.getElementById("toast");
    this.scoreElement = document.getElementById("score-value");
    this.powerElement = document.getElementById("power-value");
    this.livesElement = document.getElementById("lives");
    this.bossBar = document.getElementById("boss-bar");
    this.bossName = document.getElementById("boss-name");
    this.bossFill = document.getElementById("boss-fill");
    this.bossPercent = document.getElementById("boss-percent");
    this.menuBest = document.getElementById("menu-best");
    this.finalScore = document.getElementById("final-score");
    this.finalBest = document.getElementById("final-best");
    this.recordBadge = document.getElementById("record-badge");
    this.muteButton = document.getElementById("mute-button");
    this.error = document.getElementById("error-message");

    this.lastScore = null;
    this.lastLives = null;
    this.lastPower = null;
    this.lastBossRatio = null;
    this.warningTimer = null;
    this.toastTimer = null;

    this.bind();
    this.buildLives(PLAYER.maxLives);
  }

  bind() {
    const click = (id, handler) => {
      document.getElementById(id)?.addEventListener("click", (event) => {
        event.currentTarget.blur();
        handler();
      });
    };

    click("start-button", () => this.handlers.onStart?.());
    click("restart-button", () => this.handlers.onStart?.());
    click("resume-button", () => this.handlers.onResume?.());
    click("quit-button", () => this.handlers.onQuit?.());
    click("home-button", () => this.handlers.onMenu?.());
    click("pause-button", () => this.handlers.onPause?.());
    click("mute-button", () => this.handlers.onMute?.());
  }

  buildLives(maxLives) {
    this.livesElement.innerHTML = "";
    this.lifeNodes = [];
    for (let i = 0; i < maxLives; i += 1) {
      const life = document.createElement("span");
      life.className = "life";
      this.livesElement.append(life);
      this.lifeNodes.push(life);
    }
  }

  showHud() {
    this.hud.classList.remove("is-hidden");
  }

  hideHud() {
    this.hud.classList.add("is-hidden");
    this.hideBoss();
    this.hideWarning();
  }

  showMenu(best) {
    this.menu.classList.remove("is-hidden");
    this.pauseScreen.classList.add("is-hidden");
    this.gameoverScreen.classList.add("is-hidden");
    this.hideHud();
    this.setBest(best);
  }

  startRun(score = 0) {
    this.menu.classList.add("is-hidden");
    this.pauseScreen.classList.add("is-hidden");
    this.gameoverScreen.classList.add("is-hidden");
    this.showHud();
    this.setScore(score);
    this.setPower(1);
    this.setLives(PLAYER.maxLives);
    this.toast("");
  }

  showPause() {
    this.pauseScreen.classList.remove("is-hidden");
  }

  hidePause() {
    this.pauseScreen.classList.add("is-hidden");
  }

  showGameOver({ score, best, record }) {
    this.gameoverScreen.classList.remove("is-hidden");
    this.menu.classList.add("is-hidden");
    this.pauseScreen.classList.add("is-hidden");
    this.hideBoss();
    this.finalScore.textContent = formatScore(score);
    this.finalBest.textContent = formatScore(best);
    this.recordBadge.classList.toggle("is-hidden", !record);
    this.setBest(best);
  }

  setScore(score) {
    if (score === this.lastScore) return;
    this.lastScore = score;
    this.scoreElement.textContent = formatScore(score);
  }

  setLives(lives) {
    if (lives === this.lastLives) return;
    this.lastLives = lives;
    this.lifeNodes.forEach((node, index) => {
      node.classList.toggle("is-lost", index >= lives);
    });
  }

  setPower(level) {
    if (level === this.lastPower) return;
    this.lastPower = level;
    this.powerElement.textContent = `Lv.${level}`;
  }

  setBest(best) {
    this.menuBest.textContent = formatScore(best);
  }

  showBoss(name, maxHp) {
    this.bossName.textContent = name;
    this.bossBar.classList.remove("is-hidden");
    this.updateBoss(maxHp, maxHp);
  }

  updateBoss(hp, maxHp) {
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    if (ratio === this.lastBossRatio) return;
    this.lastBossRatio = ratio;
    this.bossFill.style.transform = `scaleX(${ratio})`;
    this.bossPercent.textContent = `${Math.ceil(ratio * 100)}%`;
  }

  hideBoss() {
    this.bossBar.classList.add("is-hidden");
    this.lastBossRatio = null;
  }

  showWarning(text = "警告 · 强敌接近") {
    this.warning.lastElementChild.textContent = text;
    this.warning.classList.remove("is-hidden");
    clearTimeout(this.warningTimer);
    this.warningTimer = window.setTimeout(() => this.hideWarning(), 2600);
  }

  hideWarning() {
    this.warning.classList.add("is-hidden");
  }

  toast(text) {
    clearTimeout(this.toastTimer);
    if (!text) {
      this.toastElement.classList.remove("is-visible");
      return;
    }
    this.toastElement.textContent = text;
    this.toastElement.classList.add("is-visible");
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.classList.remove("is-visible");
    }, 1800);
  }

  setMuted(muted) {
    this.muteButton.classList.toggle("is-muted", muted);
    this.muteButton.setAttribute("aria-label", muted ? "取消静音" : "静音");
    this.muteButton.querySelector(".icon-sound").textContent = muted ? "×" : "♪";
  }

  showError() {
    this.error.classList.remove("is-hidden");
  }
}
