/* REIN 1V1 - Holy Celestial Particle & Aura Background */
(function() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  class DivineEmber {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + Math.random() * 80;
      this.size = Math.random() * 3.5 + 1;
      this.speedY = Math.random() * 1.2 + 0.4;
      this.speedX = (Math.random() - 0.5) * 0.7;
      this.maxOpacity = Math.random() * 0.7 + 0.3;
      this.opacity = initial ? Math.random() * this.maxOpacity : 0;
      this.fadeIn = true;
      this.pulse = Math.random() * Math.PI * 2;
      this.pulseSpeed = 0.03 + Math.random() * 0.03;

      // Divine gold, sacred amber, radiant cyan, holy ruby
      const colors = [
        '245, 158, 11',  // Primary Gold
        '251, 191, 36',  // Bright Divine Amber
        '217, 119, 6',   // Deep Gold
        '56, 189, 248',  // Celestial Cyan
        '239, 68, 68'    // Champion Crimson
      ];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
      this.y -= this.speedY;
      this.x += this.speedX + Math.sin(this.pulse) * 0.3;
      this.pulse += this.pulseSpeed;

      if (this.fadeIn) {
        this.opacity += 0.015;
        if (this.opacity >= this.maxOpacity) {
          this.fadeIn = false;
        }
      } else {
        this.opacity -= 0.0025;
      }

      if (this.y < -20 || this.opacity <= 0) {
        this.reset();
      }
    }

    draw() {
      if (this.opacity <= 0) return;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = `rgba(${this.color}, 0.9)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Create ambient background embers and rays
  const embers = Array.from({ length: 65 }, () => new DivineEmber());
  let time = 0;

  function drawHolyGaze() {
    // Subtle divine radial top-center aura
    const gradient = ctx.createRadialGradient(
      width / 2, 0, 10,
      width / 2, 0, Math.max(width, height) * 0.85
    );
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.08)');
    gradient.addColorStop(0.4, 'rgba(6, 182, 212, 0.03)');
    gradient.addColorStop(1, 'rgba(7, 9, 14, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    time += 0.01;
    drawHolyGaze();

    embers.forEach(ember => {
      ember.update();
      ember.draw();
    });

    requestAnimationFrame(animate);
  }

  animate();
})();
