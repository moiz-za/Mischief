(function () {
  var ctx = null;
  var muted = false;

  function ensureContext() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  function playTone(freq, duration, type, volume, attack, decay) {
    if (muted) return;
    var c = ensureContext();
    if (!c) return;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(volume || 0.15, c.currentTime + (attack || 0.01));
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (attack || 0.01) + (decay || duration));
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + (attack || 0.01));
    osc.stop(c.currentTime + (attack || 0.01) + (decay || duration));
  }

  function purr() {
    playTone(90, 0.3, "sine", 0.12, 0.02, 0.25);
    setTimeout(function () {
      playTone(110, 0.2, "sine", 0.08, 0.02, 0.15);
    }, 100);
  }

  function chime() {
    playTone(880, 0.15, "sine", 0.1, 0.01, 0.12);
  }

  function mischief() {
    playTone(660, 0.08, "sine", 0.08, 0.01, 0.06);
    setTimeout(function () {
      playTone(880, 0.1, "sine", 0.08, 0.01, 0.08);
    }, 80);
  }

  function combo() {
    playTone(523, 0.08, "sine", 0.1, 0.01, 0.06);
    setTimeout(function () {
      playTone(659, 0.08, "sine", 0.1, 0.01, 0.06);
    }, 60);
    setTimeout(function () {
      playTone(784, 0.12, "sine", 0.1, 0.01, 0.1);
    }, 120);
  }

  function power() {
    playTone(120, 0.15, "triangle", 0.1, 0.01, 0.12);
  }

  function timeGreeting() {
    playTone(440, 0.1, "sine", 0.08, 0.01, 0.08);
    setTimeout(function () {
      playTone(554, 0.12, "sine", 0.08, 0.01, 0.1);
    }, 100);
  }

  var soundMap = {
    pet: purr,
    "combo-streak": combo,
    "power-suspend": power,
    "power-resume": power,
    "lock-screen": power,
    "unlock-screen": chime,
  };

  function playSound(soundType) {
    ensureContext();
    var fn = soundMap[soundType];
    if (fn) {
      try {
        fn();
      } catch (e) {
        // Silently ignore audio errors
      }
    }
  }

  function setMuted(value) {
    muted = value;
  }

  if (window.mischief && window.mischief.onPlaySound) {
    window.mischief.onPlaySound(function (detail) {
      if (detail && detail.soundType) {
        playSound(detail.soundType);
      }
    });
  }

  if (window.mischief && window.mischief.onMuted) {
    window.mischief.onMuted(function (value) {
      setMuted(value);
    });
  }
})();