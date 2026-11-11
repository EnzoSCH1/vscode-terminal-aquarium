(function () {
    const PIXEL_SCALE = 3;
    const OPACITY = 0.55;
    const STORAGE_KEY = 'vscode_pixel_aquarium_state_v3';

    if (window.__pixelAquariumRunning) return;
    window.__pixelAquariumRunning = true;

    const style = document.createElement('style');
    style.textContent = `
        .part.panel.bottom,
        .part.panel.bottom > .content,
        .part.panel.bottom .monaco-scrollable-element,
        .part.panel.bottom .monaco-list,
        .part.panel.bottom .monaco-list-rows,
        .part.panel.bottom .markers-panel-container,
        .part.panel.bottom .output-view,
        .part.panel.bottom .repl,
        .part.panel.bottom .terminal-outer-container,
        .part.panel.bottom .terminal-groups-container,
        .part.panel.bottom .terminal-wrapper,
        .part.panel.bottom .xterm,
        .part.panel.bottom .xterm-viewport,
        .part.panel.bottom .xterm-screen {
            background-color: transparent !important;
            background: transparent !important;
        }

        #vscode-pixel-aquarium-canvas {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 99 !important;
            image-rendering: pixelated !important;
            opacity: ${OPACITY} !important;
            mix-blend-mode: screen !important;
            pointer-events: none !important;
        }

        #vscode-pixel-aquarium-canvas.edit-mode {
            pointer-events: auto !important;
            cursor: crosshair !important;
        }

        #aquarium-ui-wrapper {
            position: absolute;
            bottom: 8px;
            right: 18px;
            z-index: 105;
            display: flex;
            align-items: center;
            gap: 6px;
            font-family: var(--vscode-font-family);
            font-size: 11px;
            color: #f8fafc;
            pointer-events: auto;
        }

        #aquarium-ui-toggle {
            background: rgba(15, 23, 42, 0.65);
            color: #94a3b8;
            border: 1px solid rgba(71, 85, 105, 0.6);
            border-radius: 4px;
            width: 24px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            padding: 0;
            transition: all 0.15s ease;
        }

        #aquarium-ui-toggle:hover, #aquarium-ui-toggle.open {
            background: rgba(15, 23, 42, 0.95);
            color: #f8fafc;
            border-color: #38bdf8;
        }

        #aquarium-ui-toolbar {
            display: none;
            gap: 6px;
            background: rgba(15, 23, 42, 0.94);
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid #475569;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        #aquarium-ui-toolbar.open {
            display: flex;
        }

        #aquarium-ui-toolbar button, #aquarium-ui-toolbar select {
            background: #1e293b;
            color: #cbd5e1;
            border: 1px solid #475569;
            padding: 2px 6px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
        }

        #aquarium-ui-toolbar button:hover, #aquarium-ui-toolbar select:hover {
            background: #334155;
            color: #fff;
        }

        #aquarium-ui-toolbar button.active {
            background: #0284c7;
            color: #fff;
            border-color: #38bdf8;
        }
    `;
    document.head.appendChild(style);

    // Sprites des poissons (Poisson-clown, Poisson-globe, Tetra, Betta)
    const FISH_SPRITES = [
        {
            palette: { '1': '#c2410c', '2': '#f97316', 'W': '#ffffff', 'B': '#111827' },
            frames: [
                ["  1221    ", " 12W2211  ", "122W222WB1", " 12W2211  ", "  1221    "],
                ["   1221   ", "  12W2211 ", " 122W222WB1", "  12W2211 ", "   1221   "]
            ]
        },
        {
            palette: { '1': '#ca8a04', '2': '#facc15', '3': '#713f12', 'W': '#ffffff', 'B': '#111827' },
            frames: [
                ["  3 3 3   ", " 1222221  ", "12222222W1", "13222222WB1", " 1222221  ", "  3 3 3   "],
                ["   3 3 3  ", "  1222221 ", " 12222222W1", " 13222222WB1", "  1222221 ", "   3 3 3  "]
            ]
        },
        {
            palette: { '1': '#059669', '2': '#34d399', 'W': '#ffffff', 'B': '#111827' },
            frames: [
                ["  1111    ", "1223321   ", " 122222W1 ", "1222222WB1", "  11111   "],
                ["   1111   ", " 1223321  ", " 122222W1 ", " 122222WB1", "   1111   "]
            ]
        },
        {
            palette: { '1': '#991b1b', '2': '#ef4444', '3': '#38bdf8', 'W': '#ffffff', 'B': '#0f172a' },
            frames: [
                [" 222333     ", "221122211   ", "211112222W1 ", "221122222WB1", " 223111111  ", "  233       "],
                ["  222333    ", " 221122211  ", "211112222W1 ", " 22112222WB1", "  22311111  ", "   233      "]
            ]
        }
    ];

    // Sprites pour les animaux de fond (Crevette rouge et Crabe)
    const BOTTOM_SPRITES = {
        shrimp: {
            palette: { '1': '#dc2626', '2': '#fca5a5', 'W': '#ffffff' },
            frames: [
                ["  112 ", " 112W ", "112   "],
                ["   112", "  112W", " 112  "]
            ]
        },
        crab: {
            palette: { '1': '#b91c1c', '2': '#f87171', 'B': '#111827' },
            frames: [
                [" 1111 ", "121121", " 1111 "],
                ["  1111", " 121121", "  1111"]
            ]
        }
    };

    let canvas = null;
    let ctx = null;
    let width = 260;
    let height = 75;
    let initialized = false;
    let fishes = [];
    let bottomCreatures = [];
    let bubbles = [];
    let foodPellets = [];
    let plants = [];
    let rocks = [];
    let soilColor = 'black';
    let currentTool = 'none';
    let menuOpen = false;
    let tick = 0;

    function saveState() {
        try {
            const data = {
                soilColor,
                rocks,
                plants,
                fishes: fishes.map(f => ({
                    spriteIdx: f.spriteIdx,
                    x: f.x,
                    y: f.y,
                    vx: f.vx,
                    vy: f.vy,
                    animOffset: f.animOffset
                })),
                bottomCreatures: bottomCreatures.map(bc => ({
                    type: bc.type,
                    x: bc.x,
                    vx: bc.vx
                }))
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (data.soilColor) soilColor = data.soilColor;
            if (Array.isArray(data.rocks)) rocks = data.rocks;
            if (Array.isArray(data.plants)) plants = data.plants;
            if (Array.isArray(data.fishes)) {
                fishes = data.fishes.map(f => ({
                    spriteIdx: f.spriteIdx ?? 0,
                    type: FISH_SPRITES[f.spriteIdx ?? 0] || FISH_SPRITES[0],
                    x: f.x,
                    y: f.y,
                    vx: f.vx,
                    vy: f.vy,
                    animOffset: f.animOffset || 0
                }));
            }
            if (Array.isArray(data.bottomCreatures)) {
                bottomCreatures = data.bottomCreatures.map(bc => ({
                    type: bc.type,
                    x: bc.x,
                    vx: bc.vx
                }));
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function updateCanvasInteractivity() {
        if (!canvas) return;
        if (menuOpen && currentTool !== 'none') {
            canvas.classList.add('edit-mode');
        } else {
            canvas.classList.remove('edit-mode');
        }
    }

    function resizeScene(w, h) {
        const newW = Math.max(120, Math.floor(w / PIXEL_SCALE));
        const newH = Math.max(40, Math.floor(h / PIXEL_SCALE));
        width = newW;
        height = newH;
        if (canvas) {
            canvas.width = width;
            canvas.height = height;
        }

        if (!initialized) {
            initialized = true;
            const restored = loadState();
            if (!restored) {
                rocks = [
                    { x: Math.floor(width * 0.08), w: 18, h: Math.floor(height * 0.65) },
                    { x: Math.floor(width * 0.12), w: 14, h: Math.floor(height * 0.48) },
                    { x: Math.floor(width * 0.45), w: 26, h: Math.floor(height * 0.55) },
                    { x: Math.floor(width * 0.78), w: 20, h: Math.floor(height * 0.50) }
                ];

                const plantCount = Math.floor(width / 9);
                for (let i = 0; i < plantCount; i++) {
                    const px = Math.floor(Math.random() * width);
                    const inSandPath = px > width * 0.32 && px < width * 0.42;
                    plants.push({
                        x: px,
                        h: inSandPath ? 4 + Math.floor(Math.random() * 4) : 10 + Math.floor(Math.random() * (height * 0.65)),
                        color: i % 3 === 0 ? '#15803d' : (i % 2 === 0 ? '#16a34a' : '#22c55e'),
                        phase: Math.random() * Math.PI * 2
                    });
                }

                for (let i = 0; i < 20; i++) {
                    const spriteIdx = i % FISH_SPRITES.length;
                    fishes.push({
                        spriteIdx,
                        type: FISH_SPRITES[spriteIdx],
                        x: Math.random() * width,
                        y: 6 + Math.random() * (height - 18),
                        vx: (0.12 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1),
                        vy: (Math.random() - 0.5) * 0.04,
                        animOffset: Math.floor(Math.random() * 20)
                    });
                }

                // Ajout initial de quelques crevettes et crabes au fond
                bottomCreatures.push(
                    { type: 'shrimp', x: Math.floor(width * 0.2), vx: 0.08 },
                    { type: 'shrimp', x: Math.floor(width * 0.6), vx: -0.06 },
                    { type: 'crab', x: Math.floor(width * 0.48), vx: 0.04 }
                );
            }

            for (let i = 0; i < 15; i++) {
                bubbles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    speed: 0.15 + Math.random() * 0.25
                });
            }
        }
    }

    function createToolbar(container) {
        let wrapper = document.getElementById('aquarium-ui-wrapper');
        if (wrapper) {
            if (!container.contains(wrapper)) container.appendChild(wrapper);
            return;
        }

        wrapper = document.createElement('div');
        wrapper.id = 'aquarium-ui-wrapper';
        wrapper.innerHTML = `
            <div id="aquarium-ui-toolbar">
                <span>Sol:</span>
                <select id="aq-soil-select">
                    <option value="black" ${soilColor === 'black' ? 'selected' : ''}>Noir</option>
                    <option value="white" ${soilColor === 'white' ? 'selected' : ''}>Blanc</option>
                    <option value="yellow" ${soilColor === 'yellow' ? 'selected' : ''}>Jaune</option>
                </select>
                <span style="margin-left: 4px;">Outil:</span>
                <button id="aq-tool-none" class="active" title="Mode normal">⌨️ Normal</button>
                <button id="aq-tool-fish" title="Ajouter un poisson">🐠 Poisson</button>
                <button id="aq-tool-plant" title="Ajouter une plante">🌿 Plante</button>
                <button id="aq-tool-rock" title="Ajouter un caillou">🪨 Caillou</button>
                <button id="aq-tool-bottom" title="Ajouter une crevette ou un crabe">🦐 Fond</button>
            </div>
            <button id="aquarium-ui-toggle" title="Personnaliser l'aquarium">⋯</button>
        `;
        container.appendChild(wrapper);

        const toggleBtn = document.getElementById('aquarium-ui-toggle');
        const toolbar = document.getElementById('aquarium-ui-toolbar');
        const btnNone = document.getElementById('aq-tool-none');
        const btnFish = document.getElementById('aq-tool-fish');
        const btnPlant = document.getElementById('aq-tool-plant');
        const btnRock = document.getElementById('aq-tool-rock');
        const btnBottom = document.getElementById('aq-tool-bottom');

        function setTool(tool) {
            currentTool = tool;
            btnNone.classList.toggle('active', tool === 'none');
            btnFish.classList.toggle('active', tool === 'fish');
            btnPlant.classList.toggle('active', tool === 'plant');
            btnRock.classList.toggle('active', tool === 'rock');
            btnBottom.classList.toggle('active', tool === 'bottom');
            updateCanvasInteractivity();
        }

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuOpen = !menuOpen;
            toolbar.classList.toggle('open', menuOpen);
            toggleBtn.classList.toggle('open', menuOpen);
            if (!menuOpen) setTool('none');
            updateCanvasInteractivity();
        });

        document.getElementById('aq-soil-select').addEventListener('change', (e) => {
            soilColor = e.target.value;
            saveState();
        });

        btnNone.addEventListener('click', () => setTool('none'));
        btnFish.addEventListener('click', () => setTool('fish'));
        btnPlant.addEventListener('click', () => setTool('plant'));
        btnRock.addEventListener('click', () => setTool('rock'));
        btnBottom.addEventListener('click', () => setTool('bottom'));
    }

    function dropFood() {
        for (let i = 0; i < 5; i++) {
            foodPellets.push({
                x: width * 0.35 + Math.random() * (width * 0.1),
                y: 2,
                vy: 0.2 + Math.random() * 0.25
            });
        }
        fishes.forEach(f => {
            f.vx = Math.sign(f.vx || 1) * Math.min(Math.abs(f.vx) * 1.6, 0.55);
            f.vy += 0.08;
        });
    }

    function drawPixelSprite(sprite, x, y, flipX, frameIdx) {
        const grid = sprite.frames[frameIdx % sprite.frames.length];
        const pal = sprite.palette;
        for (let r = 0; r < grid.length; r++) {
            const row = grid[r];
            for (let c = 0; c < row.length; c++) {
                const ch = row[c];
                if (ch === ' ' || !pal[ch]) continue;
                ctx.fillStyle = pal[ch];
                const drawX = flipX ? Math.floor(x + (row.length - 1 - c)) : Math.floor(x + c);
                const drawY = Math.floor(y + r);
                ctx.fillRect(drawX, drawY, 1, 1);
            }
        }
    }

    function render() {
        tick++;
        if (!ctx || !canvas || !canvas.isConnected) return;

        const bands = ['#0369a1', '#075985', '#0c4a6e', '#082f49', '#041e30'];
        const bandH = Math.ceil(height / bands.length);
        for (let i = 0; i < bands.length; i++) {
            ctx.fillStyle = bands[i];
            ctx.fillRect(0, i * bandH, width, bandH);
        }

        ctx.fillStyle = 'rgba(125, 211, 252, 0.10)';
        [0.22, 0.52, 0.76].forEach(pos => {
            const lx = Math.floor(width * pos);
            for (let y = 0; y < height - 6; y++) {
                const spread = Math.floor(y * 0.35);
                ctx.fillRect(lx - spread, y, spread * 2 + 2, 1);
            }
        });

        rocks.forEach(rock => {
            const baseY = height - 5;
            for (let y = baseY - rock.h; y < baseY; y++) {
                const progress = (y - (baseY - rock.h)) / rock.h;
                const currentW = Math.floor(rock.w * (0.4 + progress * 0.6));
                const startX = rock.x - Math.floor(currentW / 2);
                for (let x = startX; x < startX + currentW; x++) {
                    const hole = ((x * 7 + y * 13) % 11 === 0);
                    ctx.fillStyle = hole ? '#1c1917' : ((x + y) % 3 === 0 ? '#57534e' : '#44403c');
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        });

        const filterX = width - 10;
        ctx.fillStyle = '#64748b';
        ctx.fillRect(filterX, 2, 5, 18);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(filterX + 1, 3, 2, 16);

        plants.forEach(p => {
            const baseY = height - 5;
            for (let y = 0; y < p.h; y++) {
                const sway = Math.round(Math.sin(tick * 0.05 + y * 0.25 + p.phase) * 1.2);
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x + sway, baseY - y, 2, 1);
            }
        });

        // Déplacement et rendu des créatures du fond (crevettes et crabes)
        bottomCreatures.forEach(bc => {
            bc.x += bc.vx;
            if (bc.x > width - 6 || bc.x < 2) {
                bc.vx *= -1;
            }
            const sprite = BOTTOM_SPRITES[bc.type];
            const flipX = bc.vx < 0;
            const frameIdx = Math.floor(tick / 20);
            drawPixelSprite(sprite, bc.x, height - 7, flipX, frameIdx);
        });

        ctx.fillStyle = '#bae6fd';
        bubbles.forEach(b => {
            b.y -= b.speed;
            const bx = Math.floor(b.x + Math.sin(tick * 0.08 + b.y) * 0.8);
            if (b.y < 1) {
                b.y = height - 6;
                b.x = Math.random() * width;
            }
            ctx.fillRect(bx, Math.floor(b.y), 1, 1);
        });

        ctx.fillStyle = '#d97706';
        for (let i = foodPellets.length - 1; i >= 0; i--) {
            let fp = foodPellets[i];
            fp.y += fp.vy;
            ctx.fillRect(Math.floor(fp.x), Math.floor(fp.y), 2, 2);
            if (fp.y >= height - 6) foodPellets.splice(i, 1);
        }

        fishes.forEach(f => {
            if (Math.abs(f.vx) > 0.28) f.vx *= 0.98;

            f.x += f.vx;
            f.y += f.vy + Math.sin((tick + f.animOffset) * 0.06) * 0.03;

            if (f.x > width + 12) f.x = -12;
            if (f.x < -12) f.x = width + 12;
            if (f.y < 4) { f.y = 4; f.vy *= -1; }
            if (f.y > height - 14) { f.y = height - 14; f.vy *= -1; }

            const flipX = f.vx < 0;
            const frameIdx = Math.floor((tick + f.animOffset) / 10);
            drawPixelSprite(f.type, f.x, f.y, flipX, frameIdx);
        });

        for (let y = height - 5; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const isSandPath = x > width * 0.31 + (y - (height - 5)) && x < width * 0.43 - (y - (height - 5));
                if (isSandPath) {
                    ctx.fillStyle = (x + y) % 4 === 0 ? '#fde68a' : '#fef3c7';
                } else if (soilColor === 'black') {
                    ctx.fillStyle = (x * 3 + y) % 5 === 0 ? '#0f172a' : '#1e293b';
                } else if (soilColor === 'white') {
                    ctx.fillStyle = (x * 3 + y) % 5 === 0 ? '#cbd5e1' : '#f1f5f9';
                } else {
                    ctx.fillStyle = (x * 3 + y) % 5 === 0 ? '#d97706' : '#fde68a';
                }
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    function ensureMounted() {
        const panelContent =
            document.querySelector('#workbench\\.parts\\.panel > .content') ||
            document.querySelector('.part.panel.bottom > .content') ||
            document.querySelector('.part.panel.bottom');

        if (!panelContent) return;

        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'vscode-pixel-aquarium-canvas';
            ctx = canvas.getContext('2d');

            canvas.addEventListener('click', (e) => {
                if (!menuOpen || currentTool === 'none') return;

                const rectCanvas = canvas.getBoundingClientRect();
                const clickX = Math.floor(((e.clientX - rectCanvas.left) / rectCanvas.width) * width);
                const clickY = Math.floor(((e.clientY - rectCanvas.top) / rectCanvas.height) * height);

                if (currentTool === 'fish') {
                    const spriteIdx = Math.floor(Math.random() * FISH_SPRITES.length);
                    fishes.push({
                        spriteIdx,
                        type: FISH_SPRITES[spriteIdx],
                        x: clickX,
                        y: Math.min(clickY, height - 15),
                        vx: (0.12 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1),
                        vy: (Math.random() - 0.5) * 0.04,
                        animOffset: Math.floor(Math.random() * 20)
                    });
                } else if (currentTool === 'plant') {
                    plants.push({
                        x: clickX,
                        h: 12 + Math.floor(Math.random() * 20),
                        color: Math.random() < 0.5 ? '#16a34a' : '#22c55e',
                        phase: Math.random() * Math.PI * 2
                    });
                } else if (currentTool === 'rock') {
                    rocks.push({
                        x: clickX,
                        w: 14 + Math.floor(Math.random() * 12),
                        h: 15 + Math.floor(Math.random() * 15)
                    });
                } else if (currentTool === 'bottom') {
                    const type = Math.random() < 0.5 ? 'shrimp' : 'crab';
                    bottomCreatures.push({
                        type,
                        x: clickX,
                        vx: (Math.random() < 0.5 ? 1 : -1) * 0.06
                    });
                }
                saveState();
            });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    dropFood();
                }
            }, true);
        }

        if (!panelContent.contains(canvas)) {
            if (getComputedStyle(panelContent).position === 'static') {
                panelContent.style.position = 'relative';
            }
            panelContent.appendChild(canvas);
            createToolbar(panelContent);

            const rect = panelContent.getBoundingClientRect();
            resizeScene(rect.width || 800, rect.height || 220);

            const ro = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                        resizeScene(entry.contentRect.width, entry.contentRect.height);
                    }
                }
            });
            ro.observe(panelContent);
        }
    }

    setInterval(() => {
        ensureMounted();
        if (canvas && canvas.isConnected) {
            render();
        }
    }, 1000 / 30);
})();