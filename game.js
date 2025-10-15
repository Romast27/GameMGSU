class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.pointsValue = document.getElementById('pointsValue');
        this.buildingsList = document.getElementById('buildingsList');
        this.selectedBuildingPanel = document.getElementById('selectedBuildingPanel');
        this.selectedBuildingInfo = document.getElementById('selectedBuildingInfo');
        this.hintText = document.getElementById('hintText');
        this.bonusPanel = document.getElementById('bonusPanel');
        this.bonusText = document.getElementById('bonusText');
        this.rotateButton = document.getElementById('rotateButton');
        this.cancelButton = document.getElementById('cancelButton');

        // Игровые данные
        this.grid = new Map();
        this.buildings = [];
        this.availableBuildings = [];
        this.selectedBuilding = null;
        this.totalPoints = 0;
        this.lastUpdateTime = Date.now();
        this.lastBuildingSpawn = Date.now();
        this.buildingSpawnInterval = 30000;

        this.manegeBonusActive = false;
        this.manegeBonusEndTime = 0;

        // Параметры сетки
        this.hexSize = 28;
        this.hexWidth = this.hexSize * 2;
        this.hexHeight = this.hexSize * Math.sqrt(3);

        // Размеры прямоугольного поля
        this.gridWidth = 15;  // количество шестиугольников по ширине
        this.gridHeight = 12; // количество шестиугольников по высоте

        // Управление камерой
        this.isDragging = false;
        this.lastTouch = { x: 0, y: 0 };
        this.camera = { x: 0, y: 0 };
        this.zoom = 1;

        this.mousePos = { x: 0, y: 0 };

        this.initialize();
    }

    initialize() {
        this.resize();
        this.setupEventListeners();
        this.generateInitialBuildings();
        this.createBuildingCards();
        this.gameLoop();

        console.log('Game initialized');
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());

        // Мышь
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Тач
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleTouchStart(touch.clientX, touch.clientY);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleTouchMove(touch.clientX, touch.clientY);
        });

        this.canvas.addEventListener('touchend', () => {
            this.handleTouchEnd();
        });

        // Кнопки
        this.rotateButton.addEventListener('click', () => this.rotateBuilding());
        this.cancelButton.addEventListener('click', () => this.cancelPlacement());

        // Клавиатура
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' && this.selectedBuilding) {
                this.rotateBuilding();
            } else if (e.key === 'Escape') {
                this.cancelPlacement();
            }
        });

        // Отслеживание положения мыши
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.handleInteraction(x, y);
        this.isDragging = true;
        this.lastTouch = { x, y };
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dx = x - this.lastTouch.x;
        const dy = y - this.lastTouch.y;

        this.camera.x += dx;
        this.camera.y += dy;
        this.lastTouch = { x, y };
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    handleWheel(e) {
        e.preventDefault();
        const zoomFactor = 0.1;
        const oldZoom = this.zoom;

        this.zoom += e.deltaY > 0 ? -zoomFactor : zoomFactor;
        this.zoom = Math.max(0.3, Math.min(2, this.zoom));
    }

    handleTouchStart(x, y) {
        this.handleInteraction(x, y);
        this.isDragging = true;
        this.lastTouch = { x, y };
    }

    handleTouchMove(x, y) {
        if (!this.isDragging) return;

        const dx = x - this.lastTouch.x;
        const dy = y - this.lastTouch.y;

        this.camera.x += dx;
        this.camera.y += dy;
        this.lastTouch = { x, y };
    }

    handleTouchEnd() {
        this.isDragging = false;
    }

    handleInteraction(x, y) {
        const gridPos = this.screenToGrid(x, y);
        const [q, r] = gridPos;

        console.log('Interaction at grid:', q, r);

        // Проверка, находится ли координата в пределах поля
        if (!this.isValidGridPosition(q, r)) {
            console.log('Interaction outside grid bounds');
            return;
        }

        // Проверка клика по существующему зданию
        const coord = `${q},${r}`;
        if (this.grid.has(coord)) {
            const building = this.grid.get(coord);
            this.showBuildingInfo(building);
            return;
        }

        // Размещение здания
        if (this.selectedBuilding) {
            if (this.canPlaceBuilding(this.selectedBuilding, q, r)) {
                this.placeBuilding(this.selectedBuilding, q, r);
                this.hideBuildingInfo();
            } else {
                this.hintText.textContent = "Нельзя разместить здесь!";
                setTimeout(() => {
                    if (this.selectedBuilding) {
                        this.hintText.textContent = `Выбрано: ${this.selectedBuilding.name}. Кликните на поле для размещения`;
                    }
                }, 2000);
            }
        }
    }

    // Проверка, находится ли координата в пределах прямоугольного поля
    isValidGridPosition(q, r) {
        return q >= 0 && q < this.gridWidth && r >= 0 && r < this.gridHeight;
    }

    screenToGrid(x, y) {
        // Конвертация экранных координат в координаты сетки
        const screenX = (x - this.camera.x - this.canvas.width / 2) / this.zoom;
        const screenY = (y - this.camera.y - this.canvas.height / 2) / this.zoom;

        const q = (screenX * Math.sqrt(3) / 3 - screenY / 3) / this.hexSize;
        const r = (screenY * 2 / 3) / this.hexSize;

        const cube = this.roundCube(this.axialToCube(q, r));
        return this.cubeToAxial(cube);
    }

    axialToCube(q, r) {
        const x = q;
        const z = r;
        const y = -x - z;
        return { x, y, z };
    }

    cubeToAxial(cube) {
        return [cube.x, cube.z];
    }

    roundCube(cube) {
        let rx = Math.round(cube.x);
        let ry = Math.round(cube.y);
        let rz = Math.round(cube.z);

        const xDiff = Math.abs(rx - cube.x);
        const yDiff = Math.abs(ry - cube.y);
        const zDiff = Math.abs(rz - cube.z);

        if (xDiff > yDiff && xDiff > zDiff) {
            rx = -ry - rz;
        } else if (yDiff > zDiff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        return { x: rx, y: ry, z: rz };
    }

    gridToScreen(q, r) {
        const hexSpacing = this.hexSize * 2;
        const x = this.canvas.width / 2 + this.camera.x + this.zoom * hexSpacing * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const y = this.canvas.height / 2 + this.camera.y + this.zoom * this.hexSize * 0.75 * (3 / 2 * r);
        return { x, y };
    }

    getNeighbors(q, r) {
        return [
            [q + 1, r], [q - 1, r],
            [q, r + 1], [q, r - 1],
            [q + 1, r - 1], [q - 1, r + 1]
        ];
    }

    canPlaceBuilding(building, q, r) {
        // Сначала проверяем, находится ли центральная клетка в пределах поля
        if (!this.isValidGridPosition(q, r)) {
            return false;
        }

        const pattern = building.getRotatedPattern();

        for (const [dq, dr] of pattern) {
            const cellQ = q + dq;
            const cellR = r + dr;

            // Проверяем, находится ли клетка в пределах поля
            if (!this.isValidGridPosition(cellQ, cellR)) {
                return false;
            }

            const coord = `${cellQ},${cellR}`;

            if (this.grid.has(coord)) {
                return false;
            }
        }
        return true;
    }

    placeBuilding(building, q, r) {
        // Для Парка НЕ размещаем здание в центральной клетке
        const cellsToPlace = building.type === 'PARK' ?
            building.cellPattern : // Только кольцо, без центра
            building.cellPattern; // Все клетки

        building.cells = [];

        for (const [dq, dr] of cellsToPlace) {
            const cellQ = q + dq;
            const cellR = r + dr;
            const coord = `${cellQ},${cellR}`;

            this.grid.set(coord, building);
            building.cells.push([cellQ, cellR]);
            console.log('Cell placed:', coord, 'for building:', building.type);
        }

        building.placed = true;
        building.placementTime = Date.now();
        this.buildings.push(building);

        // Удаление из доступных
        const index = this.availableBuildings.indexOf(building);
        if (index > -1) {
            this.availableBuildings.splice(index, 1);
        }

        // Создание новой копии если остались размещения
        if (building.placementsLeft > 1 && building.placementsLeft !== Infinity) {
            const newBuilding = new Building(building.type);
            newBuilding.placementsLeft = building.placementsLeft - 1;
            this.availableBuildings.push(newBuilding);
        }

        this.applyImmediateBonuses(building);
        this.createBuildingCards();
        this.selectedBuilding = null;
        this.hintText.textContent = "Здание размещено! Выберите следующее здание.";

        console.log('Building placed:', building.type, 'at', q, r);
    }

    getParkCenter(parkBuilding) {
        if (parkBuilding.type === 'PARK' && parkBuilding.cells.length > 0) {
            // Центр рассчитывается относительно первой клетки парка
            const [firstQ, firstR] = parkBuilding.cells[0];
            return [firstQ - parkBuilding.cellPattern[0][0], firstR - parkBuilding.cellPattern[0][1]];
        }
        return null;
    }

    applyImmediateBonuses(building) {
        switch (building.type) {
            case 'KMK':
                const hourlyIncome = this.calculateHourlyIncome();
                this.totalPoints += hourlyIncome;
                console.log('KMK bonus:', hourlyIncome, 'points');
                break;
            case 'MANEGE':
                this.manegeBonusActive = true;
                this.manegeBonusEndTime = Date.now() + 20 * 60 * 1000;
                this.showBonus("Бонус Манежа: +50% скорости!");
                break;
        }
    }

    calculateBuildingIncome(building) {
        const currentTime = Date.now();
        const timeDiff = (currentTime - this.lastUpdateTime) / 60000;
        let baseIncome = building.basePoints * timeDiff;

        let bonusMultiplier = 1.0;
        let bonusAdditive = 0;

        // Проверка бонусов от соседних зданий
        for (const [cellQ, cellR] of building.cells) {
            const neighbors = this.getNeighbors(cellQ, cellR);

            for (const [nq, nr] of neighbors) {
                const neighborCoord = `${nq},${nr}`;
                const neighbor = this.grid.get(neighborCoord);

                if (neighbor) {
                    // Бонус Парка
                    if (neighbor.type === 'PARK') {
                        const parkCenter = this.getParkCenter(neighbor);
                        if (parkCenter) {
                            const [centerQ, centerR] = parkCenter;
                            // Проверяем, находится ли здание в центре парка
                            if (cellQ === centerQ && cellR === centerR) {
                                bonusMultiplier += 0.3; // +30% для центра
                            } else {
                                bonusAdditive += 10 * timeDiff; // +10 очков для соседей
                            }
                        }
                    }

                    // Бонус Свечки
                    if (neighbor.type === 'CANDLE') {
                        bonusMultiplier += 1.0; // +100%
                    }
                }
            }
        }

        // Бонус Манежа (глобальный)
        if (this.manegeBonusActive && currentTime < this.manegeBonusEndTime) {
            bonusMultiplier += 0.5;
        }

        // Бонус Ромашки
        if (building.type === 'ROMASHKA') {
            const hoursPlaced = (currentTime - building.placementTime) / 3600000;
            building.romashkaBonus = Math.floor(hoursPlaced) * 5;
            bonusAdditive += building.romashkaBonus * timeDiff;
        }

        return baseIncome * bonusMultiplier + bonusAdditive;
    }

    calculateHourlyIncome() {
        let totalHourly = 0;
        for (const building of this.buildings) {
            if (building.placed) {
                totalHourly += building.basePoints * 60;
            }
        }
        return totalHourly;
    }

    updatePoints() {
        const currentTime = Date.now();
        const timeDiff = (currentTime - this.lastUpdateTime) / 1000;

        if (timeDiff > 0) {
            for (const building of this.buildings) {
                if (building.placed) {
                    const income = this.calculateBuildingIncome(building);
                    this.totalPoints += income;
                }
            }

            if (this.manegeBonusActive && currentTime >= this.manegeBonusEndTime) {
                this.manegeBonusActive = false;
                this.bonusPanel.style.display = 'none';
            }

            this.lastUpdateTime = currentTime;
            this.pointsValue.textContent = Math.floor(this.totalPoints);
        }
    }

    spawnNewBuildings() {
        const currentTime = Date.now();
        if (currentTime - this.lastBuildingSpawn >= this.buildingSpawnInterval) {
            const buildingTypes = ['PARK', 'DORMITORY', 'ROMASHKA', 'KMK', 'CANDLE', 'MANEGE'];
            const newTypes = [];

            while (newTypes.length < 3 && newTypes.length < buildingTypes.length) {
                const randomType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
                if (!newTypes.includes(randomType)) {
                    newTypes.push(randomType);
                }
            }

            for (const type of newTypes) {
                const existing = this.availableBuildings.find(b => b.type === type);
                if (!existing || existing.placementsLeft > 1) {
                    const building = new Building(type);
                    this.availableBuildings.push(building);
                }
            }

            this.lastBuildingSpawn = currentTime;
            this.createBuildingCards();
            this.hintText.textContent = "Появились новые здания!";
        }
    }

    generateInitialBuildings() {
        const initialTypes = ['DORMITORY', 'ROMASHKA'];

        for (const type of initialTypes) {
            const building = new Building(type);
            this.availableBuildings.push(building);
        }

        console.log('Initial buildings generated:', this.availableBuildings);
    }

    createBuildingCards() {
        this.buildingsList.innerHTML = '';

        if (this.availableBuildings.length === 0) {
            this.buildingsList.innerHTML = '<div style="color: #ccc; text-align: center;">Нет доступных зданий</div>';
            return;
        }

        for (const building of this.availableBuildings) {
            const card = document.createElement('div');
            card.className = 'building-card';
            if (building === this.selectedBuilding) {
                card.classList.add('selected');
            }

            const countText = building.placementsLeft === Infinity ? '' :
                             `Осталось: ${building.placementsLeft}`;

            card.innerHTML = `
                <div class="building-name">${building.name}</div>
                <div class="building-stats">${building.basePoints} очков/мин</div>
                ${countText ? `<div class="building-count">${countText}</div>` : ''}
            `;

            card.style.backgroundColor = building.color;
            card.style.color = this.getContrastColor(building.color);

            card.addEventListener('click', () => {
                this.selectBuilding(building);
            });

            this.buildingsList.appendChild(card);
        }
    }

    selectBuilding(building) {
        this.selectedBuilding = building;
        this.createBuildingCards();
        this.selectedBuildingPanel.style.display = 'block';
        this.hintText.textContent = `Выбрано: ${building.name}. Кликните на поле для размещения (R - повернуть, ESC - отмена)`;

        this.updateSelectedBuildingInfo();
        console.log('Building selected:', building.type);
    }

    updateSelectedBuildingInfo() {
        if (!this.selectedBuilding) return;

        this.selectedBuildingInfo.innerHTML = `
            <div class="building-info-name" style="color: ${this.selectedBuilding.color}">
                ${this.selectedBuilding.name}
            </div>
            <div class="building-info-stats">
                <div>${this.selectedBuilding.basePoints} очков/мин</div>
                <div>${this.selectedBuilding.description.replace(/\n/g, '<br>')}</div>
                <div>Размер: ${this.selectedBuilding.size} клеток</div>
            </div>
        `;
    }

    rotateBuilding() {
        if (this.selectedBuilding) {
            this.selectedBuilding.rotation = (this.selectedBuilding.rotation + 60) % 360;
            this.updateSelectedBuildingInfo();
            console.log('Building rotated to:', this.selectedBuilding.rotation);
        }
    }

    cancelPlacement() {
        this.selectedBuilding = null;
        this.selectedBuildingPanel.style.display = 'none';
        this.createBuildingCards();
        this.hintText.textContent = "Выберите здание и разместите его на поле";
        console.log('Placement cancelled');
    }

    showBuildingInfo(building) {
        const hours = Math.floor((Date.now() - building.placementTime) / 3600000);
        const minutes = Math.floor(((Date.now() - building.placementTime) % 3600000) / 60000);

        this.selectedBuildingInfo.innerHTML = `
            <div class="building-info-name" style="color: ${building.color}">
                ${building.name}
            </div>
            <div class="building-info-stats">
                <div>Размещено: ${hours}ч ${minutes}м назад</div>
                <div>Доход: ${building.basePoints} очков/мин</div>
                ${building.romashkaBonus > 0 ? `<div>Бонус Ромашки: +${building.romashkaBonus} очков</div>` : ''}
            </div>
        `;
        this.selectedBuildingPanel.style.display = 'block';
    }

    hideBuildingInfo() {
        this.selectedBuildingPanel.style.display = 'none';
    }

    showBonus(text) {
        this.bonusText.textContent = text;
        this.bonusPanel.style.display = 'block';
        this.bonusPanel.classList.add('pulse');

        setTimeout(() => {
            this.bonusPanel.classList.remove('pulse');
        }, 2000);
    }

    getContrastColor(hexcolor) {
        const r = parseInt(hexcolor.substr(1, 2), 16);
        const g = parseInt(hexcolor.substr(3, 2), 16);
        const b = parseInt(hexcolor.substr(5, 2), 16);
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    drawHexagon(x, y, color, alpha = 1) {
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i;
            const hexX = x + this.hexSize * this.zoom * Math.cos(angle);
            const hexY = y + this.hexSize * this.zoom * Math.sin(angle);

            if (i === 0) {
                this.ctx.moveTo(hexX, hexY);
            } else {
                this.ctx.lineTo(hexX, hexY);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawGrid() {
        // Рисуем прямоугольную сетку
        for (let q = 0; q < this.gridWidth; q++) {
            for (let r = 0; r < this.gridHeight; r++) {
                const { x, y } = this.gridToScreen(q, r);

                // Проверяем, видна ли клетка на экране
                if (x > -100 && x < this.canvas.width + 100 &&
                    y > -100 && y < this.canvas.height + 100) {

                    const coord = `${q},${r}`;
                    const building = this.grid.get(coord);

                    if (building) {
                        this.drawHexagon(x, y, building.color, 0.9);
                    } else {
                        this.drawHexagon(x, y, '#334155', 0.3);
                    }
                }
            }
        }

        // Рисуем превью выбранного здания
        if (this.selectedBuilding) {
            const gridPos = this.screenToGrid(this.mousePos.x, this.mousePos.y);
            const [q, r] = gridPos;

            // Проверяем, находится ли позиция в пределах поля
            if (this.isValidGridPosition(q, r)) {
                const canPlace = this.canPlaceBuilding(this.selectedBuilding, q, r);
                const previewColor = canPlace ? this.selectedBuilding.color : '#ef4444';
                const previewAlpha = canPlace ? 0.6 : 0.4;

                const pattern = this.selectedBuilding.getRotatedPattern();
                for (const [dq, dr] of pattern) {
                    const previewPos = this.gridToScreen(q + dq, r + dr);
                    this.drawHexagon(previewPos.x, previewPos.y, previewColor, previewAlpha);
                }
            }
        }
    }

    drawUI() {
        // Рисуем бонусный индикатор
        if (this.manegeBonusActive) {
            const remainingTime = Math.max(0, this.manegeBonusEndTime - Date.now());
            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);

            this.ctx.fillStyle = 'rgba(246, 224, 94, 0.9)';
            this.ctx.fillRect(this.canvas.width - 200, 120, 180, 40);
            this.ctx.fillStyle = '#1a202c';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('Бонус Манежа +50%', this.canvas.width - 190, 140);
            this.ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, this.canvas.width - 190, 160);
        }

        // Отладочная информация
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`Зданий на поле: ${this.buildings.length}`, 10, 30);
        this.ctx.fillText(`Доступно зданий: ${this.availableBuildings.length}`, 10, 45);
        this.ctx.fillText(`Занято клеток: ${this.grid.size}`, 10, 60);
        this.ctx.fillText(`Размер поля: ${this.gridWidth}x${this.gridHeight}`, 10, 75);

        // Показываем координаты мыши для отладки
        const gridPos = this.screenToGrid(this.mousePos.x, this.mousePos.y);
        this.ctx.fillText(`Мышь: ${Math.round(this.mousePos.x)},${Math.round(this.mousePos.y)}`, 10, 90);
        this.ctx.fillText(`Сетка: ${gridPos[0]},${gridPos[1]}`, 10, 105);
        this.ctx.fillText(`В поле: ${this.isValidGridPosition(gridPos[0], gridPos[1]) ? 'Да' : 'Нет'}`, 10, 120);
    }

    gameLoop() {
        // Очищаем canvas
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.updatePoints();
        this.spawnNewBuildings();
        this.drawGrid();
        this.drawUI();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// Запуск игры после загрузки страницы
window.addEventListener('load', () => {
    console.log('Starting game...');
    new Game();
});
