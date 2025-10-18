class Building {
    constructor(type) {
        this.type = type;
        this.cells = [];
        this.placed = false;
        this.rotation = 0;
        this.placementTime = Date.now();
        this.romashkaBonus = 0;
        this.bonusActive = false;
        this.bonusEndTime = 0;

        this.setupBuilding();
    }

    setupBuilding() {
        const buildingConfigs = {
            PARK: {
                name: "🌳 Парк",
                color: "#27ae60",
                basePoints: 50,
                maxPlacements: 1,
                placementsLeft: 1,
                cellPattern: [[1,0], [1,-1], [0,-1], [-1,0], [0,1], [1,1]], // Кольцо из 6 клеток, центр [0,0] пустой
                description: "Занимает 6 клеток по кругу<br>+30% центру, +10 соседям",
                size: 6,
                hasEmptyCenter: true, // Центральная клетка пустая
                centerCell: [0,0] // Координата центральной клетки
            },
            DORMITORY: {
                name: "🏢 Общежитие",
                color: "#95a5a6",
                basePoints: 150,
                maxPlacements: Infinity,
                placementsLeft: Infinity,
                cellPattern: [[0,0], [1,0]],
                description: "150 очков/минуту<br>Занимает 2 клетки",
                size: 2
            },
            ROMASHKA: {
                name: "🌼 Ромашка",
                color: "#ecf0f1",
                basePoints: 30,
                maxPlacements: 3,
                placementsLeft: 3,
                cellPattern: [[0,0]],
                description: "+5 очков каждый час<br>30 очков/минуту",
                size: 1
            },
            KMK: {
                name: "🏭 КМК",
                color: "#e67e22",
                basePoints: 80,
                maxPlacements: 5,
                placementsLeft: 5,
                cellPattern: [[0,0], [1,0], [2,0]],
                description: "Очки за 5 минут всех зданий<br>80 очков/минуту",
                size: 3
            },
            CANDLE: {
                name: "🕯️ Свечка",
                color: "#e74c3c",
                basePoints: 50,
                maxPlacements: 1,
                placementsLeft: 1,
                cellPattern: [[0,0]],
                description: "+100% соседним зданиям<br>50 очков/минуту",
                size: 1
            },
            MANEGE: {
                name: "🏟️ Манеж",
                color: "#9b59b6",
                basePoints: 75,
                maxPlacements: Infinity,
                placementsLeft: Infinity,
                cellPattern: [[0,0], [1,0], [0,1]],
                description: "+50% скорости на 20 мин<br>75 очков/минуту",
                size: 3
            }
        };

        const config = buildingConfigs[this.type];
        Object.assign(this, config);
    }

    // Получить координаты центра для Парка (пустая клетка в середине)
    getCenterPosition(q, r) {
        if (this.type === 'PARK' && this.hasEmptyCenter) {
            return [q + this.centerCell[0], r + this.centerCell[1]];
        }
        return null;
    }

    // Получить все клетки включая центр (для проверки занятости)
    getAllCells(q, r) {
        const allCells = [...this.cells];

        // Для Парка добавляем центральную клетку в проверку занятости
        if (this.type === 'PARK' && this.hasEmptyCenter) {
            allCells.push(this.centerCell);
        }

        return allCells.map(([dq, dr]) => [q + dq, r + dr]);
    }
}