const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('start');
const title = document.getElementById('title');
const status = document.getElementById('status');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

let keys = {};
let running = false;
let score = 0;
let best = Number(localStorage.getItem('malik-arena-best') || 0);
let lastTime = 0;
let spawnClock = 0;
let starClock = 0;
let enemies = [];
let stars = [];
let particles = [];

bestEl.textContent = best;

const player = { x: 450, y: 270, r: 12, speed: 290 };

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const wide = rect.width / rect.height > 1.3;
  if (wide) {
    canvas.width = 900;
    canvas.height = 540;
  } else {
    canvas.width = 540;
    canvas.height = 720;
  }
  player.x = Math.min(player.x, canvas.width);
  player.y = Math.min(player.y, canvas.height);
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * canvas.width; y = -20; }
  if (side === 1) { x = canvas.width + 20; y = Math.random() * canvas.height; }
  if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 20; }
  if (side === 3) { x = -20; y = Math.random() * canvas.height; }
  const angle = Math.atan2(player.y - y, player.x - x);
  const speed = 85 + Math.min(score * 2.5, 150) + Math.random() * 60;
  enemies.push({ x, y, r: 10 + Math.random() * 7, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
}

function spawnStar() {
  stars.push({ x: 30 + Math.random() * (canvas.width - 60), y: 30 + Math.random() * (canvas.height - 60), r: 9, pulse: 0 });
}

function burst(x, y, color) {
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 180;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .5 + Math.random() * .5, color });
  }
}

function update(dt) {
  let dx = 0, dy = 0;
  if (keys.w || keys.arrowup) dy--;
  if (keys.s || keys.arrowdown) dy++;
  if (keys.a || keys.arrowleft) dx--;
  if (keys.d || keys.arrowright) dx++;
  if (dx && dy) { dx *= .7071; dy *= .7071; }
  player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x + dx * player.speed * dt));
  player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y + dy * player.speed * dt));

  spawnClock -= dt;
  if (spawnClock <= 0) { spawnEnemy(); spawnClock = Math.max(.22, .85 - score * .008); }
  starClock -= dt;
  if (starClock <= 0 && stars.length < 2) { spawnStar(); starClock = 2.5 + Math.random() * 2; }

  for (const enemy of enemies) { enemy.x += enemy.vx * dt; enemy.y += enemy.vy * dt; }
  enemies = enemies.filter(enemy => {
    const hit = Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.r + player.r;
    if (hit) endGame();
    return enemy.x > -40 && enemy.x < canvas.width + 40 && enemy.y > -40 && enemy.y < canvas.height + 40 && !hit;
  });

  stars = stars.filter(star => {
    star.pulse += dt * 5;
    if (Math.hypot(star.x - player.x, star.y - player.y) < star.r + player.r) {
      score += 10;
      scoreEl.textContent = score;
      burst(star.x, star.y, '#62f3ff');
      return false;
    }
    return true;
  });

  particles = particles.filter(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.life > 0; });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0d1020';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(98,243,255,.055)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

  for (const star of stars) {
    ctx.save(); ctx.translate(star.x, star.y); ctx.rotate(star.pulse * .15);
    ctx.fillStyle = '#62f3ff'; ctx.shadowColor = '#62f3ff'; ctx.shadowBlur = 18;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 ? 4 : star.r;
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  for (const enemy of enemies) {
    ctx.fillStyle = '#ff4da6'; ctx.shadowColor = '#ff4da6'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2); ctx.fill();
  }

  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;

  ctx.fillStyle = '#f7f8ff'; ctx.shadowColor = '#62f3ff'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}

function loop(time) {
  if (!running) return;
  const dt = Math.min((time - lastTime) / 1000, .032);
  lastTime = time;
  update(dt);
  draw();
  if (running) requestAnimationFrame(loop);
}

function startGame() {
  resizeCanvas();
  score = 0; spawnClock = .5; starClock = 1;
  enemies = []; stars = []; particles = [];
  player.x = canvas.width / 2; player.y = canvas.height / 2;
  scoreEl.textContent = '0';
  running = true; lastTime = performance.now();
  overlay.classList.add('hidden');
  draw(); requestAnimationFrame(loop);
}

function endGame() {
  if (!running) return;
  running = false;
  if (score > best) { best = score; localStorage.setItem('malik-arena-best', best); bestEl.textContent = best; }
  title.textContent = 'RUN OVER'; status.textContent = `Score ${score}`; startButton.textContent = 'TRY AGAIN';
  overlay.classList.remove('hidden');
}

window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; e.prevent.preventDefault?.(); });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
startButton.addEventListener('click', startGame);
window.addEventListener('resize', resizeCanvas);

canvas.addEventListener('pointermove', e => {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  player.x = (e.clientX - rect.left) / rect.width * canvas.width;
  player.y = (e.clientY - rect.top) / rect.height * canvas.height;
});

resizeCanvas(); draw();
