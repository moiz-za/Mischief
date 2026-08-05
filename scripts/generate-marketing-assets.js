const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const { encodeGif } = require("../dist/domain/gif");

app.disableHardwareAcceleration();

// Read real companion SVGs from experience packs
const catSvg = fs.readFileSync(path.join(__dirname, "../examples/experiences/cat-companion/images/whiskers.svg"), "utf8");
const zenSvg = fs.readFileSync(path.join(__dirname, "../examples/experiences/zen-companion/images/zen.svg"), "utf8");
const kumoSvg = fs.readFileSync(path.join(__dirname, "../examples/experiences/kumo-companion/images/kumo.svg"), "utf8");
const byteSvg = fs.readFileSync(path.join(__dirname, "../examples/experiences/byte-companion/images/byte.svg"), "utf8");
const astraSvg = fs.readFileSync(path.join(__dirname, "../examples/experiences/astra-companion/images/astra.svg"), "utf8");
const logoSvg = fs.readFileSync(path.join(__dirname, "../assets/branding/logo.svg"), "utf8");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renderFrame(win) {
  const image = await win.webContents.capturePage();
  const bgra = image.toBitmap();
  const size = image.getSize();
  const totalPixels = bgra.length / 4;
  const scale = Math.round(Math.sqrt(totalPixels / (size.width * size.height))) || 1;
  const width = size.width * scale;
  const height = size.height * scale;
  return { bgra, width, height };
}

function getSocialPreviewHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body {
    width: 1280px;
    height: 640px;
    background: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 60%, #020617 100%);
    color: #f8fafc;
    display: flex;
    flex-direction: column;
    justify: space-between;
    padding: 40px 50px;
    overflow: hidden;
    position: relative;
  }
  
  /* Background decorative grid & glow */
  .grid-bg {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .glow-orb {
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.15;
    pointer-events: none;
  }
  .glow-1 { top: -100px; left: 200px; background: #38bdf8; }
  .glow-2 { bottom: -100px; right: 100px; background: #f97316; }

  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 2;
  }
  .logo-box {
    width: 54px;
    height: 54px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 8px;
    backdrop-filter: blur(10px);
  }
  .logo-box svg { width: 100%; height: 100%; }
  
  .brand-title {
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .badge {
    margin-left: auto;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    background: rgba(56, 189, 248, 0.1);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.25);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .main-content {
    z-index: 2;
    margin-top: 10px;
  }
  .tagline {
    font-size: 26px;
    font-weight: 600;
    color: #94a3b8;
    max-width: 800px;
    line-height: 1.35;
  }
  .highlight {
    color: #38bdf8;
    font-weight: 700;
  }

  .cards-row {
    display: flex;
    gap: 20px;
    margin-top: 28px;
    z-index: 2;
  }
  
  .companion-card {
    flex: 1;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 18px;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  }

  .card-avatar {
    width: 90px;
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card-avatar svg { width: 100%; height: 100%; }

  .card-name {
    margin-top: 10px;
    font-size: 16px;
    font-weight: 700;
    color: #f1f5f9;
  }
  .card-role {
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
    font-weight: 500;
  }

  .footer-features {
    display: flex;
    gap: 24px;
    z-index: 2;
    margin-top: auto;
  }
  .feat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #cbd5e1;
    background: rgba(15, 23, 42, 0.6);
    padding: 8px 16px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .feat-icon { font-size: 16px; }
</style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="glow-orb glow-1"></div>
  <div class="glow-orb glow-2"></div>

  <div class="header">
    <div class="logo-box">${logoSvg}</div>
    <div class="brand-title">Mischief</div>
    <div class="badge">v0.4.1 • Open Source</div>
  </div>

  <div class="main-content">
    <div class="tagline">
      The <span class="highlight">offline-first, privacy-first</span> desktop entertainment platform with real personality.
    </div>
  </div>

  <div class="cards-row">
    <div class="companion-card">
      <div class="card-avatar">${zenSvg}</div>
      <div class="card-name">Zen</div>
      <div class="card-role">Red Panda</div>
    </div>
    <div class="companion-card">
      <div class="card-avatar">${catSvg}</div>
      <div class="card-name">Whiskers</div>
      <div class="card-role">Playful Cat</div>
    </div>
    <div class="companion-card">
      <div class="card-avatar">${kumoSvg}</div>
      <div class="card-name">Kumo</div>
      <div class="card-role">Cyber Fox</div>
    </div>
    <div class="companion-card">
      <div class="card-avatar">${byteSvg}</div>
      <div class="card-name">Byte</div>
      <div class="card-role">Vintage Bot</div>
    </div>
    <div class="companion-card">
      <div class="card-avatar">${astraSvg}</div>
      <div class="card-name">Astra</div>
      <div class="card-role">Stardust Dragon</div>
    </div>
  </div>

  <div class="footer-features">
    <div class="feat-item"><span class="feat-icon">🔒</span> 100% Offline & Private</div>
    <div class="feat-item"><span class="feat-icon">🎭</span> 19 Flagship Characters</div>
    <div class="feat-item"><span class="feat-icon">⚡</span> Reversible Antics</div>
    <div class="feat-item"><span class="feat-icon">🧩</span> Experience Packs</div>
  </div>
</body>
</html>`;
}

function getHeroDemoHtml(frameIndex, totalFrames) {
  // Animation progress 0 to 1
  const t = frameIndex / totalFrames;

  // Companion x position (walking from 220px to 380px, then idle/bounce)
  let posX = 240 + Math.min(1, t * 2.2) * 140;
  let animClass = "anim-walk";
  let bubbleText = "Checking your code... ✨";
  let bubbleOpacity = t > 0.15 ? 1 : 0;
  let cursorX = 500;
  let cursorY = 300;
  let cursorOpacity = 0;
  let heartsOpacity = 0;
  let zzzOpacity = 0;
  let rotation = 0;
  let scaleY = 1;

  if (t > 0.35 && t <= 0.65) {
    animClass = "anim-happy";
    bubbleText = "Combo x3! Super happy! 🎉";
    cursorOpacity = Math.sin((t - 0.35) * Math.PI / 0.3);
    cursorX = posX + 30;
    cursorY = 220;
    heartsOpacity = 1;
    scaleY = 1 + Math.sin(t * Math.PI * 10) * 0.08;
  } else if (t > 0.65 && t <= 0.85) {
    animClass = "anim-spin";
    bubbleText = "Build green! Let's celebrate! 🚀";
    rotation = (t - 0.65) * 5 * 360;
  } else if (t > 0.85) {
    animClass = "anim-sleep";
    bubbleText = "Resting between tasks... 💤";
    zzzOpacity = 1;
  }

  const walkBob = Math.sin(t * Math.PI * 12) * 4;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body {
    width: 720px;
    height: 400px;
    background: #090d16;
    color: #f8fafc;
    position: relative;
    overflow: hidden;
  }

  /* Desktop Mockup Background */
  .desktop {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 70% 30%, #1e293b 0%, #0f172a 70%, #090d16 100%);
  }

  /* Code Window Mockup */
  .code-editor {
    position: absolute;
    top: 30px;
    left: 30px;
    width: 320px;
    height: 340px;
    background: #020617;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    overflow: hidden;
  }

  .editor-header {
    height: 32px;
    background: #0f172a;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 6px;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-red { background: #ef4444; }
  .dot-yellow { background: #eab308; }
  .dot-green { background: #22c55e; }
  .editor-title { margin-left: 10px; font-size: 11px; color: #64748b; font-family: monospace; }

  .editor-body {
    padding: 14px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    line-height: 1.6;
    color: #94a3b8;
  }
  .kw { color: #f472b6; }
  .str { color: #38bdf8; }
  .func { color: #a7f3d0; }
  .cm { color: #475569; font-style: italic; }

  /* Mischief Floating Header Badge */
  .header-badge {
    position: absolute;
    top: 20px;
    right: 30px;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    padding: 6px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(8px);
  }
  .hb-logo { width: 18px; height: 18px; }
  .hb-text { font-size: 12px; font-weight: 700; color: #f8fafc; }

  /* Companion Sprite Canvas Container */
  .companion-container {
    position: absolute;
    left: ${posX}px;
    top: ${210 + walkBob}px;
    width: 100px;
    height: 100px;
    transform: rotate(${rotation}deg) scaleY(${scaleY});
    transform-origin: 50% 80%;
    transition: transform 0.05s linear;
  }
  .companion-container svg { width: 100%; height: 100%; }

  /* Speech Bubble */
  .speech-bubble {
    position: absolute;
    left: ${posX - 40}px;
    top: ${145 + walkBob}px;
    background: #ffffff;
    color: #0f172a;
    padding: 8px 14px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    opacity: ${bubbleOpacity};
    white-space: nowrap;
    z-index: 10;
  }
  .speech-bubble::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 60px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid #ffffff;
  }

  /* Particles */
  .hearts {
    position: absolute;
    left: ${posX + 30}px;
    top: ${180}px;
    font-size: 18px;
    opacity: ${heartsOpacity};
  }

  .zzz {
    position: absolute;
    left: ${posX + 70}px;
    top: ${180}px;
    font-size: 16px;
    font-weight: 800;
    color: #38bdf8;
    opacity: ${zzzOpacity};
  }

  /* Interactive Hand Cursor */
  .cursor {
    position: absolute;
    left: ${cursorX}px;
    top: ${cursorY}px;
    font-size: 24px;
    opacity: ${cursorOpacity};
    z-index: 20;
    pointer-events: none;
  }
</style>
</head>
<body>
  <div class="desktop"></div>

  <div class="code-editor">
    <div class="editor-header">
      <div class="dot dot-red"></div>
      <div class="dot dot-yellow"></div>
      <div class="dot dot-green"></div>
      <div class="editor-title">mischief-companion.ts</div>
    </div>
    <div class="editor-body">
      <span class="cm">// Initialize real companion</span><br/>
      <span class="kw">const</span> companion = <span class="kw">new</span> <span class="func">Mischief</span>({<br/>
      &nbsp;&nbsp;pack: <span class="str">"zen-companion"</span>,<br/>
      &nbsp;&nbsp;mode: <span class="str">"interactive"</span><br/>
      });<br/><br/>
      <span class="cm">// Deterministic personality</span><br/>
      companion.<span class="func">on</span>(<span class="str">"commit"</span>, () =&gt; {<br/>
      &nbsp;&nbsp;companion.<span class="func">speak</span>(<span class="str">"Build green! 🚀"</span>);<br/>
      });
    </div>
  </div>

  <div class="header-badge">
    <div class="hb-logo">${logoSvg}</div>
    <div class="hb-text">Mischief Desktop</div>
  </div>

  <div class="speech-bubble">${bubbleText}</div>
  <div class="hearts">💖 ✨</div>
  <div class="zzz">Z<sup>z</sup><sub>z</sub></div>

  <div class="companion-container">
    ${zenSvg}
  </div>

  <div class="cursor">👉</div>
</body>
</html>`;
}

function getWhiskersBehaviorHtml(behavior, frameIndex, totalFrames) {
  const t = frameIndex / totalFrames;
  let transform = "";
  let zzzOpacity = 0;
  let hideTranslateY = 0;

  if (behavior === "spin") {
    transform = `rotate(${t * 360}deg)`;
  } else if (behavior === "dance") {
    const danceX = Math.sin(t * Math.PI * 4) * 12;
    const danceY = -Math.abs(Math.sin(t * Math.PI * 4)) * 10;
    transform = `translate(${danceX}px, ${danceY}px) rotate(${danceX * 0.5}deg)`;
  } else if (behavior === "hide") {
    hideTranslateY = Math.sin(t * Math.PI * 2) * 25 + 25;
    transform = `translateY(${hideTranslateY}px)`;
  } else if (behavior === "idle") {
    const idleY = Math.sin(t * Math.PI * 2) * 4;
    transform = `translateY(${idleY}px)`;
    zzzOpacity = 0.8;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 240px;
    height: 180px;
    background: #0f172a;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .bg-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 20px 20px;
  }

  .window-frame {
    width: 200px;
    height: 140px;
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .avatar {
    width: 80px;
    height: 80px;
    transform: ${transform};
    transform-origin: center center;
  }
  .avatar svg { width: 100%; height: 100%; }

  .zzz {
    position: absolute;
    top: 25px;
    right: 45px;
    font-size: 14px;
    font-weight: 800;
    color: #38bdf8;
    opacity: ${zzzOpacity};
  }
</style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="window-frame">
    <div class="zzz">Z<sup>z</sup></div>
    <div class="avatar">${catSvg}</div>
  </div>
</body>
</html>`;
}

async function generateAllAssets() {
  console.log("Starting marketing assets generation...");

  const demosDir = path.join(__dirname, "../assets/demos");
  const brandingDir = path.join(__dirname, "../assets/branding");
  fs.mkdirSync(demosDir, { recursive: true });
  fs.mkdirSync(brandingDir, { recursive: true });

  // 1. Generate social-preview.png (1280 x 640)
  console.log("Generating social-preview.png...");
  const winSocial = new BrowserWindow({
    width: 1280,
    height: 640,
    show: false,
    webPreferences: { offscreen: true }
  });
  await winSocial.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSocialPreviewHtml())}`);
  await sleep(600);
  const socialImage = await winSocial.webContents.capturePage();
  const socialPath = path.join(brandingDir, "social-preview.png");
  fs.writeFileSync(socialPath, socialImage.toPNG());
  console.log(`Saved ${socialPath}`);
  winSocial.close();

  // 2. Generate hero.gif (720 x 400, 36 frames)
  console.log("Generating hero.gif...");
  const winHero = new BrowserWindow({
    width: 720,
    height: 400,
    show: false,
    webPreferences: { offscreen: true }
  });
  const heroFrames = [];
  const heroTotalFrames = 36;
  for (let i = 0; i < heroTotalFrames; i++) {
    const html = getHeroDemoHtml(i, heroTotalFrames);
    await winHero.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await sleep(50);
    const frame = await renderFrame(winHero);
    heroFrames.push(frame);
  }
  const heroGifBuffer = encodeGif(heroFrames, { width: heroFrames[0].width, height: heroFrames[0].height, delayCs: 10, loop: 0 });
  const heroPath = path.join(demosDir, "hero.gif");
  fs.writeFileSync(heroPath, heroGifBuffer);
  console.log(`Saved ${heroPath}`);
  winHero.close();

  // 3. Generate Whiskers behavior GIFs (240 x 180, 16 frames each)
  const behaviors = ["spin", "dance", "hide", "idle"];
  for (const b of behaviors) {
    console.log(`Generating whiskers-${b}.gif...`);
    const winB = new BrowserWindow({
      width: 240,
      height: 180,
      show: false,
      webPreferences: { offscreen: true }
    });
    const bFrames = [];
    const bTotalFrames = 16;
    for (let i = 0; i < bTotalFrames; i++) {
      const html = getWhiskersBehaviorHtml(b, i, bTotalFrames);
      await winB.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await sleep(30);
      const frame = await renderFrame(winB);
      bFrames.push(frame);
    }
    const bBuffer = encodeGif(bFrames, { width: bFrames[0].width, height: bFrames[0].height, delayCs: 10, loop: 0 });
    const bPath = path.join(demosDir, `whiskers-${b}.gif`);
    fs.writeFileSync(bPath, bBuffer);
    console.log(`Saved ${bPath}`);
    winB.close();
  }

  console.log("All marketing assets generated successfully!");
  app.quit();
}

app.whenReady().then(() => {
  generateAllAssets().catch((err) => {
    console.error("Failed to generate assets:", err);
    app.exit(1);
  });
});
