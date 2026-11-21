        const canvas = document.getElementById('gompieCanvas');
        const ctx = canvas.getContext('2d', { alpha: false });

        const bgCanvas = document.createElement('canvas');
        const bgCtx = bgCanvas.getContext('2d', { alpha: false });
        const sprites = {};

        let width = window.innerWidth;
        let height = window.innerHeight;
        let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        let bouquets = [];
        let fireflies = [];
        let driftingPetals = [];
        let globalTime = 0;
        let lastTimestamp = 0;
        let pointerX = width * 0.5;
        let breeze = 0;
        let breezeVel = 0;

        // ============================================================================
        // MATH & EASING UTILITIES
        // ============================================================================
        function randomRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        function clamp(val, min, max) {
            return Math.min(Math.max(val, min), max);
        }

        function lerp(a, b, t) {
            return a + (b - a) * t;
        }

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function easeOutQuint(t) {
            return 1 - Math.pow(1 - t, 5);
        }

        // ============================================================================
        // GOMPIE CULTIVAR PALETTES (PASTEL BOUQUET: PINK, LILAC, YELLOW, BLUE)
        // ============================================================================
        const GOMPIE_PALETTES = [
            {
                name: 'Gompie Pastel Pink',
                outerBase: '#be185d',
                outerMid: '#f472b6',
                outerTip: '#fce7f3',
                rim: 'rgba(255, 241, 242, 0.80)',
                discOuter: '#65a30d',
                discInner: '#fde047',
                glow: 'pink'
            },
            {
                name: 'Gompie Soft Lilac',
                outerBase: '#6d28d9',
                outerMid: '#c084fc',
                outerTip: '#f3e8ff',
                rim: 'rgba(250, 245, 255, 0.82)',
                discOuter: '#4d7c0f',
                discInner: '#bef264',
                glow: 'lilac'
            },
            {
                name: 'Gompie Butter Yellow',
                outerBase: '#ca8a04',
                outerMid: '#facc15',
                outerTip: '#fef9c3',
                rim: 'rgba(254, 252, 232, 0.85)',
                discOuter: '#65a30d',
                discInner: '#ecfccb',
                glow: 'yellow'
            },
            {
                name: 'Gompie Sky Blue',
                outerBase: '#0369a1',
                outerMid: '#38bdf8',
                outerTip: '#e0f2fe',
                rim: 'rgba(240, 249, 255, 0.82)',
                discOuter: '#4d7c0f',
                discInner: '#fef08a',
                glow: 'blue'
            }
        ];

        // ============================================================================
        // OFFSCREEN GLOW SPRITES & NIGHT GARDEN BACKDROP CACHE
        // ============================================================================
        function createRadialSprite(size, stops) {
            const off = document.createElement('canvas');
            off.width = size;
            off.height = size;
            const octx = off.getContext('2d');
            const half = size * 0.5;
            const grad = octx.createRadialGradient(half, half, 0, half, half, half);
            stops.forEach(([offset, color]) => grad.addColorStop(offset, color));
            octx.fillStyle = grad;
            octx.fillRect(0, 0, size, size);
            return off;
        }

        function initSprites() {
            sprites.pink = createRadialSprite(220, [
                [0.0, 'rgba(244, 114, 182, 0.36)'],
                [0.45, 'rgba(236, 72, 153, 0.14)'],
                [1.0, 'rgba(0, 0, 0, 0)']
            ]);
            sprites.lilac = createRadialSprite(220, [
                [0.0, 'rgba(192, 132, 252, 0.36)'],
                [0.45, 'rgba(168, 85, 247, 0.14)'],
                [1.0, 'rgba(0, 0, 0, 0)']
            ]);
            sprites.yellow = createRadialSprite(220, [
                [0.0, 'rgba(250, 204, 21, 0.34)'],
                [0.45, 'rgba(234, 179, 8, 0.14)'],
                [1.0, 'rgba(0, 0, 0, 0)']
            ]);
            sprites.blue = createRadialSprite(220, [
                [0.0, 'rgba(56, 189, 248, 0.34)'],
                [0.45, 'rgba(14, 165, 233, 0.14)'],
                [1.0, 'rgba(0, 0, 0, 0)']
            ]);
            sprites.firefly = createRadialSprite(44, [
                [0.0, 'rgba(254, 249, 195, 0.96)'],
                [0.32, 'rgba(250, 204, 21, 0.45)'],
                [0.75, 'rgba(132, 204, 22, 0.10)'],
                [1.0, 'rgba(0, 0, 0, 0)']
            ]);
        }

        function rebuildGardenBackdrop() {
            bgCanvas.width = Math.floor(width * dpr);
            bgCanvas.height = Math.floor(height * dpr);
            bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const bgGrad = bgCtx.createRadialGradient(
                width * 0.5, height * 0.38, 30,
                width * 0.5, height * 0.52, Math.max(width, height) * 0.85
            );
            bgGrad.addColorStop(0.0, '#18242e');
            bgGrad.addColorStop(0.45, '#0e151c');
            bgGrad.addColorStop(1.0, '#06090e');
            bgCtx.fillStyle = bgGrad;
            bgCtx.fillRect(0, 0, width, height);

            // Soft bokeh light circles in the background
            bgCtx.save();
            bgCtx.globalCompositeOperation = 'screen';
            const bokehColors = [
                'rgba(244, 114, 182, 0.06)',
                'rgba(192, 132, 252, 0.06)',
                'rgba(250, 204, 21, 0.05)',
                'rgba(56, 189, 248, 0.06)'
            ];
            for (let i = 0; i < 22; i++) {
                const bx = ((i * 173 + 41) % 100) / 100 * width;
                const by = ((i * 131 + 19) % 100) / 100 * height * 0.78;
                const br = 28 + (i % 5) * 22;
                const g = bgCtx.createRadialGradient(bx, by, 0, bx, by, br);
                g.addColorStop(0, bokehColors[i % bokehColors.length]);
                g.addColorStop(1, 'rgba(0, 0, 0, 0)');
                bgCtx.fillStyle = g;
                bgCtx.beginPath();
                bgCtx.arc(bx, by, br, 0, Math.PI * 2);
                bgCtx.fill();
            }
            bgCtx.restore();

            // Subtle table shadow under the bouquet
            const tableShadow = bgCtx.createRadialGradient(
                width * 0.5, height * 0.88, 10,
                width * 0.5, height * 0.88, Math.min(width, 460) * 0.55
            );
            tableShadow.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
            tableShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            bgCtx.fillStyle = tableShadow;
            bgCtx.beginPath();
            bgCtx.ellipse(width * 0.5, height * 0.88, Math.min(width, 460) * 0.52, 42, 0, 0, Math.PI * 2);
            bgCtx.fill();
        }

        // ============================================================================
        // ATMOSPHERIC FIREFLIES & DRIFTING PETALS
        // ============================================================================
        function initAtmosphere() {
            const count = clamp(Math.floor((width * height) / 38000), 14, 30);
            fireflies = [];
            for (let i = 0; i < count; i++) {
                fireflies.push({
                    x: randomRange(0, width),
                    y: randomRange(0, height * 0.85),
                    vx: randomRange(-8, 8),
                    vy: randomRange(-12, -3),
                    size: randomRange(8, 16),
                    phase: randomRange(0, Math.PI * 2),
                    speed: randomRange(1.4, 2.8)
                });
            }
            driftingPetals = [];
        }

        function spawnPetalBurst(x, y, palette) {
            for (let i = 0; i < 12; i++) {
                const ang = randomRange(0, Math.PI * 2);
                const spd = randomRange(25, 85);
                driftingPetals.push({
                    x,
                    y,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 20,
                    rot: randomRange(0, Math.PI * 2),
                    vRot: randomRange(-3, 3),
                    rx: randomRange(4, 7),
                    ry: randomRange(2.2, 3.8),
                    color: palette.outerMid,
                    life: 1.0
                });
            }
        }

        function updateAndDrawAtmosphere(context, dt) {
            context.save();
            context.globalCompositeOperation = 'screen';
            for (let i = 0; i < fireflies.length; i++) {
                const f = fireflies[i];
                f.x += (f.vx + breeze * 28) * dt + Math.sin(globalTime * 1.4 + f.phase) * 0.3;
                f.y += f.vy * dt;
                if (f.y < -20) {
                    f.y = height * 0.85;
                    f.x = randomRange(0, width);
                }
                if (f.x < -20) f.x = width + 20;
                if (f.x > width + 20) f.x = -20;

                const alpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(globalTime * f.speed + f.phase));
                context.globalAlpha = alpha;
                context.drawImage(sprites.firefly, f.x - f.size, f.y - f.size, f.size * 2, f.size * 2);
            }
            context.restore();

            for (let i = driftingPetals.length - 1; i >= 0; i--) {
                const p = driftingPetals[i];
                p.x += (p.vx + breeze * 35) * dt;
                p.y += p.vy * dt;
                p.vy += 28 * dt;
                p.rot += p.vRot * dt;
                p.life -= dt * 0.65;

                if (p.life <= 0) {
                    driftingPetals.splice(i, 1);
                    continue;
                }

                context.save();
                context.translate(p.x, p.y);
                context.rotate(p.rot);
                context.globalAlpha = clamp(p.life, 0, 1);
                context.fillStyle = p.color;
                context.beginPath();
                context.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
                context.fill();
                context.restore();
            }
        }

        // ============================================================================
        // GOMPIE CHRYSANTHEMUM SPRAY BRANCH & BLOSSOM RENDERING
        // ============================================================================
        class GompieSprayBranch {
            constructor(opts) {
                this.baseX = opts.baseX;
                this.baseY = opts.baseY;
                this.height = opts.height || 260;
                this.lean = opts.lean || 0;
                this.mainRadius = opts.mainRadius || 56;
                this.palette = opts.palette || GOMPIE_PALETTES[0];
                this.delay = opts.delay || 0;
                this.age = -this.delay;
                this.bloomDuration = 2.1;
                this.swayPhase = randomRange(0, Math.PI * 2);

                // Side spray buds/blooms branching off main stem
                this.sideBlooms = opts.sideBlooms || [
                    { t: 0.56, side: -1, angleOff: -0.46, lenRatio: 0.34, radRatio: 0.66, delayOff: 0.25 },
                    { t: 0.68, side: 1,  angleOff: 0.44,  lenRatio: 0.30, radRatio: 0.60, delayOff: 0.40 }
                ];
            }

            update(dt) {
                this.age += dt;
            }

            evalStemPoint(t, swayOffset) {
                const bend = this.lean * Math.pow(t, 1.35) * this.height * 0.65 + swayOffset * Math.pow(t, 1.6);
                const x = this.baseX + bend;
                const y = this.baseY - t * this.height;
                return { x, y };
            }

            drawChrysanthemumLeaf(context, x, y, angle, len, wid, scale) {
                context.save();
                context.translate(x, y);
                context.rotate(angle);

                // Lobed chrysanthemum foliage silhouette
                context.beginPath();
                context.moveTo(0, 0);
                context.quadraticCurveTo(len * 0.25, -wid * 0.7, len * 0.42, -wid * 0.45);
                context.quadraticCurveTo(len * 0.55, -wid * 1.05, len * 0.74, -wid * 0.65);
                context.quadraticCurveTo(len * 0.90, -wid * 0.45, len, 0);
                context.quadraticCurveTo(len * 0.90, wid * 0.45, len * 0.74, wid * 0.65);
                context.quadraticCurveTo(len * 0.55, wid * 1.05, len * 0.42, wid * 0.45);
                context.quadraticCurveTo(len * 0.25, wid * 0.7, 0, 0);
                context.closePath();

                const leafGrad = context.createLinearGradient(0, 0, len, 0);
                leafGrad.addColorStop(0, '#14532d');
                leafGrad.addColorStop(0.6, '#15803d');
                leafGrad.addColorStop(1, '#22c55e');
                context.fillStyle = leafGrad;
                context.fill();

                context.strokeStyle = 'rgba(134, 239, 172, 0.35)';
                context.lineWidth = 0.9 * scale;
                context.stroke();

                // Central leaf vein
                context.beginPath();
                context.moveTo(2, 0);
                context.lineTo(len * 0.88, 0);
                context.strokeStyle = 'rgba(187, 247, 208, 0.40)';
                context.lineWidth = 0.8 * scale;
                context.stroke();

                context.restore();
            }

            drawGompieBlossom(context, cx, cy, radius, openAmount, tiltAngle, palette) {
                if (openAmount <= 0.01) return;

                const R = radius * lerp(0.18, 1.0, easeOutCubic(openAmount));
                const pulse = 1 + Math.sin(globalTime * 2.1 + this.swayPhase) * 0.018 * openAmount;
                const finalR = R * pulse;

                // Soft pastel glow halo behind flower head
                const glowSprite = sprites[palette.glow] || sprites.pink;
                const glowR = finalR * 2.15;
                context.save();
                context.globalCompositeOperation = 'screen';
                context.globalAlpha = clamp(openAmount * 0.85, 0, 1);
                context.drawImage(glowSprite, cx - glowR, cy - glowR, glowR * 2, glowR * 2);
                context.restore();

                context.save();
                context.translate(cx, cy);
                context.rotate(tiltAngle);

                // Two-tiered Gompie daisy-spray ray florets (outer + inner overlapping rings)
                const layers = [
                    { count: 22, lenMult: 1.00, widMult: 0.23, rotOff: 0,    shade: 0.92 },
                    { count: 20, lenMult: 0.84, widMult: 0.21, rotOff: 0.15, shade: 1.00 }
                ];

                layers.forEach((layer) => {
                    const pLen = finalR * layer.lenMult;
                    const pWid = finalR * layer.widMult;

                    for (let i = 0; i < layer.count; i++) {
                        const ang = (i / layer.count) * Math.PI * 2 + layer.rotOff;
                        context.save();
                        context.rotate(ang);

                        // Spoon-tipped rounded Gompie ray floret
                        context.beginPath();
                        context.moveTo(0, -pWid * 0.26);
                        context.bezierCurveTo(
                            pLen * 0.35, -pWid * 0.56,
                            pLen * 0.85, -pWid * 0.62,
                            pLen, 0
                        );
                        context.bezierCurveTo(
                            pLen * 0.85, pWid * 0.62,
                            pLen * 0.35, pWid * 0.56,
                            0, pWid * 0.26
                        );
                        context.closePath();

                        const pGrad = context.createLinearGradient(0, 0, pLen, 0);
                        pGrad.addColorStop(0.0, palette.outerBase);
                        pGrad.addColorStop(0.55, palette.outerMid);
                        pGrad.addColorStop(1.0, palette.outerTip);
                        context.fillStyle = pGrad;
                        context.fill();

                        // Subtle longitudinal petal crease & tip highlight
                        context.strokeStyle = palette.rim;
                        context.lineWidth = 0.75;
                        context.stroke();

                        context.beginPath();
                        context.moveTo(pLen * 0.18, 0);
                        context.lineTo(pLen * 0.78, 0);
                        context.strokeStyle = 'rgba(255, 255, 255, 0.22)';
                        context.lineWidth = 0.65;
                        context.stroke();

                        context.restore();
                    }
                });

                // Characteristic lime-green to golden button disc center
                const discR = finalR * 0.26;
                const discGrad = context.createRadialGradient(
                    -discR * 0.2, -discR * 0.2, discR * 0.1,
                    0, 0, discR
                );
                discGrad.addColorStop(0.0, palette.discInner);
                discGrad.addColorStop(0.75, palette.discOuter);
                discGrad.addColorStop(1.0, '#365314');

                context.beginPath();
                context.arc(0, 0, discR, 0, Math.PI * 2);
                context.fillStyle = discGrad;
                context.fill();

                // Tiny floret stipples inside the button disc
                const stipples = 14;
                context.fillStyle = 'rgba(254, 249, 195, 0.75)';
                for (let s = 0; s < stipples; s++) {
                    const sa = (s / stipples) * Math.PI * 2 + 0.3;
                    const sr = discR * (s % 2 === 0 ? 0.58 : 0.32);
                    context.beginPath();
                    context.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, Math.max(0.8, discR * 0.09), 0, Math.PI * 2);
                    context.fill();
                }

                context.restore();
            }

            drawStemsAndLeaves(context) {
                if (this.age < 0) return;

                const growT = easeOutCubic(clamp(this.age / 0.85, 0, 1));
                const sway = Math.sin(globalTime * 1.6 + this.swayPhase) * 8 + breeze * 26;
                const tip = this.evalStemPoint(growT, sway);
                const ctrl = this.evalStemPoint(growT * 0.5, sway * 0.45);

                context.save();
                context.lineCap = 'round';

                // Main stem
                context.beginPath();
                context.moveTo(this.baseX, this.baseY);
                context.quadraticCurveTo(ctrl.x, ctrl.y, tip.x, tip.y);
                context.strokeStyle = '#166534';
                context.lineWidth = 3.6;
                context.stroke();

                context.beginPath();
                context.moveTo(this.baseX - 0.8, this.baseY);
                context.quadraticCurveTo(ctrl.x - 0.8, ctrl.y, tip.x - 0.8, tip.y);
                context.strokeStyle = '#4ade80';
                context.lineWidth = 1.1;
                context.stroke();

                // Foliage leaves along stem
                if (growT > 0.35) {
                    const l1 = this.evalStemPoint(0.36 * growT, sway * 0.35);
                    this.drawChrysanthemumLeaf(context, l1.x, l1.y, this.lean - 0.65, 34 * growT, 14 * growT, growT);
                }
                if (growT > 0.55) {
                    const l2 = this.evalStemPoint(0.54 * growT, sway * 0.52);
                    this.drawChrysanthemumLeaf(context, l2.x, l2.y, this.lean + 0.68, 30 * growT, 12 * growT, growT);
                }

                // Side spray stems
                this.sideBlooms.forEach((sb) => {
                    if (growT < sb.t) return;
                    const branchGrow = easeOutCubic(clamp((growT - sb.t) / (1 - sb.t + 0.15), 0, 1));
                    const anchor = this.evalStemPoint(sb.t * growT, sway * sb.t);
                    const bLen = this.height * sb.lenRatio * branchGrow;
                    const bAng = this.lean + sb.angleOff + sway * 0.004;
                    const bx = anchor.x + Math.sin(bAng) * bLen;
                    const by = anchor.y - Math.cos(bAng) * bLen;

                    context.beginPath();
                    context.moveTo(anchor.x, anchor.y);
                    context.quadraticCurveTo(
                        lerp(anchor.x, bx, 0.5) + sb.side * 6,
                        lerp(anchor.y, by, 0.5),
                        bx,
                        by
                    );
                    context.strokeStyle = '#15803d';
                    context.lineWidth = 2.4;
                    context.stroke();
                });

                context.restore();
            }

            drawBlooms(context) {
                if (this.age < 0) return;

                const growT = easeOutCubic(clamp(this.age / 0.85, 0, 1));
                const sway = Math.sin(globalTime * 1.6 + this.swayPhase) * 8 + breeze * 26;
                const tip = this.evalStemPoint(growT, sway);
                const mainOpen = easeOutQuint(clamp((this.age - 0.15) / this.bloomDuration, 0, 1));

                // Side spray blossoms
                this.sideBlooms.forEach((sb) => {
                    if (growT < sb.t) return;
                    const branchGrow = easeOutCubic(clamp((growT - sb.t) / (1 - sb.t + 0.15), 0, 1));
                    const anchor = this.evalStemPoint(sb.t * growT, sway * sb.t);
                    const bLen = this.height * sb.lenRatio * branchGrow;
                    const bAng = this.lean + sb.angleOff + sway * 0.004;
                    const bx = anchor.x + Math.sin(bAng) * bLen;
                    const by = anchor.y - Math.cos(bAng) * bLen;

                    const sideOpen = easeOutQuint(clamp((this.age - (0.15 + sb.delayOff)) / this.bloomDuration, 0, 1));
                    this.drawGompieBlossom(
                        context,
                        bx,
                        by,
                        this.mainRadius * sb.radRatio,
                        sideOpen,
                        bAng * 0.5,
                        this.palette
                    );
                });

                // Main terminal blossom
                this.drawGompieBlossom(
                    context,
                    tip.x,
                    tip.y,
                    this.mainRadius,
                    mainOpen,
                    this.lean * 0.45 + sway * 0.003,
                    this.palette
                );
            }
        }

        // ============================================================================
        // BOUQUET WRAPPING PAPER & SATIN RIBBON
        // ============================================================================
        function drawBouquetBackWrap(context, cx, tieY, scale) {
            context.save();
            // Back cone of pastel-cream & kraft florist paper behind the blossoms
            context.beginPath();
            context.moveTo(cx, tieY + 28 * scale);
            context.lineTo(cx - 175 * scale, tieY - 210 * scale);
            context.quadraticCurveTo(cx, tieY - 255 * scale, cx + 175 * scale, tieY - 210 * scale);
            context.closePath();

            const backGrad = context.createLinearGradient(0, tieY - 245 * scale, 0, tieY + 28 * scale);
            backGrad.addColorStop(0.0, '#f5ebe0');
            backGrad.addColorStop(0.55, '#e3d5ca');
            backGrad.addColorStop(1.0, '#b08968');
            context.fillStyle = backGrad;
            context.fill();

            context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            context.lineWidth = 1.5;
            context.stroke();
            context.restore();
        }

        function drawBouquetFrontWrapAndRibbon(context, cx, tieY, scale) {
            context.save();

            // Lower stem bundle skirt
            context.beginPath();
            context.moveTo(cx - 26 * scale, tieY);
            context.lineTo(cx - 56 * scale, tieY + 115 * scale);
            context.quadraticCurveTo(cx, tieY + 128 * scale, cx + 56 * scale, tieY + 115 * scale);
            context.lineTo(cx + 26 * scale, tieY);
            context.closePath();
            const skirtGrad = context.createLinearGradient(cx - 56 * scale, 0, cx + 56 * scale, 0);
            skirtGrad.addColorStop(0, '#9c6644');
            skirtGrad.addColorStop(0.5, '#ddb892');
            skirtGrad.addColorStop(1, '#7f5539');
            context.fillStyle = skirtGrad;
            context.fill();

            // Left overlapping front paper fold
            context.beginPath();
            context.moveTo(cx + 18 * scale, tieY + 16 * scale);
            context.lineTo(cx - 148 * scale, tieY - 95 * scale);
            context.quadraticCurveTo(cx - 75 * scale, tieY - 40 * scale, cx + 22 * scale, tieY + 10 * scale);
            context.closePath();
            const leftFoldGrad = context.createLinearGradient(cx - 148 * scale, tieY - 95 * scale, cx, tieY);
            leftFoldGrad.addColorStop(0, '#f3e8ff');
            leftFoldGrad.addColorStop(1, '#d5bdaf');
            context.fillStyle = leftFoldGrad;
            context.fill();

            // Right overlapping front paper fold
            context.beginPath();
            context.moveTo(cx - 18 * scale, tieY + 16 * scale);
            context.lineTo(cx + 148 * scale, tieY - 95 * scale);
            context.quadraticCurveTo(cx + 75 * scale, tieY - 40 * scale, cx - 22 * scale, tieY + 10 * scale);
            context.closePath();
            const rightFoldGrad = context.createLinearGradient(cx + 148 * scale, tieY - 95 * scale, cx, tieY);
            rightFoldGrad.addColorStop(0, '#fce7f3');
            rightFoldGrad.addColorStop(1, '#c6ac8f');
            context.fillStyle = rightFoldGrad;
            context.fill();

            // Satin Ribbon Tails
            context.strokeStyle = '#f472b6';
            context.lineWidth = 7 * scale;
            context.lineCap = 'round';
            context.beginPath();
            context.moveTo(cx - 4 * scale, tieY + 6 * scale);
            context.quadraticCurveTo(cx - 28 * scale, tieY + 52 * scale, cx - 44 * scale, tieY + 95 * scale);
            context.moveTo(cx + 4 * scale, tieY + 6 * scale);
            context.quadraticCurveTo(cx + 28 * scale, tieY + 52 * scale, cx + 44 * scale, tieY + 95 * scale);
            context.stroke();

            // Satin Ribbon Bow Loops
            context.fillStyle = '#ec4899';
            context.beginPath();
            context.ellipse(cx - 24 * scale, tieY + 2 * scale, 22 * scale, 11 * scale, -0.25, 0, Math.PI * 2);
            context.ellipse(cx + 24 * scale, tieY + 2 * scale, 22 * scale, 11 * scale, 0.25, 0, Math.PI * 2);
            context.fill();

            // Center Ribbon Knot
            context.beginPath();
            context.roundRect(cx - 9 * scale, tieY - 7 * scale, 18 * scale, 18 * scale, 5 * scale);
            context.fillStyle = '#fbcfe8';
            context.fill();

            context.restore();
        }

        // ============================================================================
        // SCENE SEEDING & INTERACTION (ORGANIC FLORIST BOUQUET ARRANGEMENT)
        // ============================================================================
        function seedGompieGarden() {
            bouquets = [];
            const minDim = Math.min(width, height);
            const scale = clamp(minDim / 680, 0.68, 1.22);
            const cx = width * 0.5;
            const tieY = height * 0.74;

            // Asymmetrical, layered florist dome arrangement (back-to-front depth)
            const arrangement = [
                // Back tall airy stems (creating natural height silhouette)
                {
                    dx: -16 * scale, h: 318 * scale, lean: -0.22, r: 54 * scale, pal: 1, delay: 0.14,
                    sideBlooms: [{ t: 0.62, side: -1, angleOff: -0.48, lenRatio: 0.32, radRatio: 0.62, delayOff: 0.30 }]
                },
                {
                    dx: 12 * scale,  h: 326 * scale, lean: 0.15,  r: 58 * scale, pal: 3, delay: 0.08,
                    sideBlooms: [{ t: 0.64, side: 1,  angleOff: 0.44,  lenRatio: 0.30, radRatio: 0.60, delayOff: 0.26 }]
                },

                // Mid-layer asymmetrical spread
                {
                    dx: -24 * scale, h: 256 * scale, lean: -0.40, r: 50 * scale, pal: 2, delay: 0.28,
                    sideBlooms: [{ t: 0.54, side: -1, angleOff: -0.42, lenRatio: 0.34, radRatio: 0.64, delayOff: 0.42 }]
                },
                {
                    dx: 22 * scale,  h: 268 * scale, lean: 0.36,  r: 52 * scale, pal: 0, delay: 0.22,
                    sideBlooms: [{ t: 0.58, side: 1,  angleOff: 0.46,  lenRatio: 0.33, radRatio: 0.64, delayOff: 0.36 }]
                },

                // Foreground focal blooms nestled lower & overlapping naturally
                {
                    dx: -6 * scale,  h: 244 * scale, lean: -0.10, r: 64 * scale, pal: 0, delay: 0.00,
                    sideBlooms: [{ t: 0.55, side: -1, angleOff: -0.52, lenRatio: 0.28, radRatio: 0.56, delayOff: 0.20 }]
                },
                {
                    dx: 10 * scale,  h: 214 * scale, lean: 0.20,  r: 56 * scale, pal: 2, delay: 0.18,
                    sideBlooms: []
                },
                {
                    dx: -14 * scale, h: 196 * scale, lean: -0.26, r: 48 * scale, pal: 3, delay: 0.32,
                    sideBlooms: []
                }
            ];

            arrangement.forEach((item) => {
                bouquets.push(
                    new GompieSprayBranch({
                        baseX: cx + item.dx,
                        baseY: tieY + 18 * scale,
                        height: item.h,
                        lean: item.lean,
                        mainRadius: item.r,
                        palette: GOMPIE_PALETTES[item.pal],
                        delay: item.delay,
                        sideBlooms: item.sideBlooms
                    })
                );
            });
        }

        function spawnGompieAt(x) {
            if (bouquets.length >= 12) {
                bouquets.shift();
            }
            const minDim = Math.min(width, height);
            const scale = clamp(minDim / 680, 0.68, 1.20);
            const cx = width * 0.5;
            const tieY = height * 0.74;
            const palette = GOMPIE_PALETTES[Math.floor(Math.random() * GOMPIE_PALETTES.length)];
            const leanFromCenter = clamp((x - cx) / (260 * scale), -0.44, 0.44);

            const branch = new GompieSprayBranch({
                baseX: cx + randomRange(-16, 16) * scale,
                baseY: tieY + 18 * scale,
                height: randomRange(195, 320) * scale,
                lean: leanFromCenter,
                mainRadius: randomRange(48, 64) * scale,
                palette,
                delay: 0,
                sideBlooms: Math.random() > 0.35
                    ? [{ t: randomRange(0.54, 0.66), side: leanFromCenter < 0 ? -1 : 1, angleOff: leanFromCenter < 0 ? -0.44 : 0.44, lenRatio: 0.31, radRatio: 0.60, delayOff: 0.22 }]
                    : []
            });
            bouquets.push(branch);
            spawnPetalBurst(x, height * 0.46, palette);
        }

        function resizeCanvas() {
            width = window.innerWidth;
            height = window.innerHeight;
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            rebuildGardenBackdrop();
            initAtmosphere();
            seedGompieGarden();
        }

        function animate(timestamp) {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
            lastTimestamp = timestamp;
            globalTime += dt;

            // Spring-damped gentle breeze physics
            const springForce = -14.0 * breeze - 4.2 * breezeVel;
            breezeVel += springForce * dt;
            breeze += breezeVel * dt;

            ctx.drawImage(bgCanvas, 0, 0, width, height);

            const minDim = Math.min(width, height);
            const scale = clamp(minDim / 680, 0.68, 1.22);
            const cx = width * 0.5;
            const tieY = height * 0.74;

            // 1. Back bouquet paper cone
            drawBouquetBackWrap(ctx, cx, tieY, scale);

            // 2. Update & draw stems and leaves first so blossoms overlap cleanly
            for (let i = 0; i < bouquets.length; i++) {
                bouquets[i].update(dt);
                bouquets[i].drawStemsAndLeaves(ctx);
            }

            // 3. Draw Gompie flower heads
            for (let i = 0; i < bouquets.length; i++) {
                bouquets[i].drawBlooms(ctx);
            }

            // 4. Front overlapping bouquet wrap & satin ribbon
            drawBouquetFrontWrapAndRibbon(ctx, cx, tieY, scale);

            // 5. Drifting petals & fireflies
            updateAndDrawAtmosphere(ctx, dt);

            requestAnimationFrame(animate);
        }

        canvas.addEventListener('pointermove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const nx = e.clientX - rect.left;
            const dx = nx - pointerX;
            pointerX = nx;
            breezeVel = clamp(breezeVel + dx * 0.035, -3.5, 3.5);
        });

        canvas.addEventListener('pointerdown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            breezeVel = clamp(breezeVel + (x < width * 0.5 ? -1.4 : 1.4), -3.5, 3.5);
            spawnGompieAt(x);
        });

        window.addEventListener('resize', resizeCanvas);

        initSprites();
        resizeCanvas();
        requestAnimationFrame(animate);
    
