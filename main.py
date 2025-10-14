import pygame
import sys
import math
import random
from enum import Enum
from typing import List, Dict, Tuple, Optional

# Инициализация Pygame
pygame.init()

# Настройки для смартфонов
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
GRID_SIZE = 60
GRID_OFFSET_X = 400
GRID_OFFSET_Y = 300

# Цвета
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (200, 200, 200)
GREEN = (100, 200, 100)
BLUE = (100, 100, 255)
RED = (255, 100, 100)
YELLOW = (255, 255, 100)
PURPLE = (200, 100, 200)
ORANGE = (255, 165, 0)
CYAN = (100, 200, 200)


class BuildingType(Enum):
    PARK = "Парк"
    BANK = "Банк"
    SCHOOL = "Школа"
    APARTMENT = "Многоквартирный дом"
    ROMASHKA = "Ромашка"
    KMK = "КМК"
    CANDLE = "Свечка"
    MANEGE = "Манеж"


class Building:
    def __init__(self, building_type: BuildingType):
        self.type = building_type
        self.cells = []
        self.placed = False
        self.rotation = 0
        self.bonus_active = False
        self.bonus_end_time = 0
        self.romashka_bonus = 0
        self.placement_time = pygame.time.get_ticks()

        # Установка параметров в зависимости от типа здания
        self.setup_building()

    def setup_building(self):
        if self.type == BuildingType.PARK:
            self.color = GREEN
            self.base_points = 50
            self.max_placements = 1
            self.placements_left = 1
            self.cell_pattern = [(0, 0), (1, 0), (2, 0), (0, 1), (0, -1), (-1, 0)]

        elif self.type == BuildingType.BANK:
            self.color = YELLOW
            self.base_points = 65
            self.max_placements = float('inf')
            self.placements_left = float('inf')
            self.cell_pattern = [(0, 0)]

        elif self.type == BuildingType.SCHOOL:
            self.color = BLUE
            self.base_points = 60
            self.max_placements = float('inf')
            self.placements_left = float('inf')
            self.cell_pattern = [(0, 0)]

        elif self.type == BuildingType.APARTMENT:
            self.color = GRAY
            self.base_points = 150
            self.max_placements = float('inf')
            self.placements_left = float('inf')
            self.cell_pattern = [(0, 0), (1, 0)]

        elif self.type == BuildingType.ROMASHKA:
            self.color = WHITE
            self.base_points = 30
            self.max_placements = 3
            self.placements_left = 3
            self.cell_pattern = [(0, 0)]

        elif self.type == BuildingType.KMK:
            self.color = ORANGE
            self.base_points = 80
            self.max_placements = 5
            self.placements_left = 5
            self.cell_pattern = [(0, 0), (1, 0), (2, 0)]

        elif self.type == BuildingType.CANDLE:
            self.color = RED
            self.base_points = 50
            self.max_placements = 1
            self.placements_left = 1
            self.cell_pattern = [(0, 0)]

        elif self.type == BuildingType.MANEGE:
            self.color = PURPLE
            self.base_points = 75
            self.max_placements = float('inf')
            self.placements_left = float('inf')
            self.cell_pattern = [(0, 0), (1, 0), (0, 1)]


class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Строитель мечты")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.Font(None, 36)
        self.small_font = pygame.font.Font(None, 24)

        self.grid = {}
        self.buildings = []
        self.available_buildings = []
        self.selected_building = None
        self.total_points = 0
        self.last_update_time = pygame.time.get_ticks()
        self.last_building_spawn = pygame.time.get_ticks()
        self.building_spawn_interval = 30000  # 30 секунд

        self.manege_bonus_active = False
        self.manege_bonus_end_time = 0

        self.generate_initial_buildings()

    def generate_initial_buildings(self):
        # Начальные здания
        initial_types = [
            BuildingType.BANK,
            BuildingType.SCHOOL,
            BuildingType.APARTMENT,
            BuildingType.ROMASHKA
        ]

        for building_type in initial_types:
            self.available_buildings.append(Building(building_type))

    def hex_to_pixel(self, q, r):
        x = GRID_OFFSET_X + GRID_SIZE * (3 / 2 * q)
        y = GRID_OFFSET_Y + GRID_SIZE * (math.sqrt(3) * (r + q / 2))
        return (x, y)

    def pixel_to_hex(self, x, y):
        # Упрощенная конвертация для шестиугольной сетки
        q = round((x - GRID_OFFSET_X) / (GRID_SIZE * 1.5))
        r = round((y - GRID_OFFSET_Y) / (GRID_SIZE * math.sqrt(3)) - q / 2)
        return (q, r)

    def get_neighbors(self, q, r):
        # Соседние клетки в шестиугольной сетке
        return [
            (q + 1, r), (q - 1, r),
            (q, r + 1), (q, r - 1),
            (q + 1, r - 1), (q - 1, r + 1)
        ]

    def can_place_building(self, building, q, r):
        # Проверка возможности размещения здания
        for dq, dr in building.cell_pattern:
            cell_q, cell_r = q + dq, r + dr
            if (cell_q, cell_r) in self.grid:
                return False
        return True

    def place_building(self, building, q, r):
        if not self.can_place_building(building, q, r):
            return False

        # Размещение здания на сетке
        for dq, dr in building.cell_pattern:
            cell_q, cell_r = q + dq, r + dr
            self.grid[(cell_q, cell_r)] = building

        building.cells = [(q + dq, r + dr) for dq, dr in building.cell_pattern]
        building.placed = True
        building.placement_time = pygame.time.get_ticks()

        # Применение немедленных бонусов
        self.apply_immediate_bonuses(building)

        return True

    def apply_immediate_bonuses(self, building):
        if building.type == BuildingType.BANK:
            self.total_points += 300

        elif building.type == BuildingType.KMK:
            # Бонус КМК - очки за 1 час всех зданий
            hourly_income = self.calculate_hourly_income()
            self.total_points += hourly_income

    def calculate_building_income(self, building):
        current_time = pygame.time.get_ticks()
        base_income = building.base_points * (current_time - self.last_update_time) / 60000  # очки в минуту

        # Бонусы от других зданий
        bonus_multiplier = 1.0
        bonus_additive = 0

        # Проверка соседних зданий для бонусов
        for cell in building.cells:
            neighbors = self.get_neighbors(*cell)
            for neighbor in neighbors:
                if neighbor in self.grid:
                    neighbor_building = self.grid[neighbor]

                    # Бонус Парка
                    if neighbor_building.type == BuildingType.PARK:
                        if cell == building.cells[0]:  # Центральная клетка
                            bonus_multiplier += 0.3
                        else:
                            bonus_additive += 10

                    # Бонус Школы для вузовских зданий
                    elif neighbor_building.type == BuildingType.SCHOOL:
                        if building.type in [BuildingType.KMK, BuildingType.MANEGE]:  # Пример вузовских зданий
                            bonus_multiplier += 0.2

                    # Бонус Свечки
                    elif neighbor_building.type == BuildingType.CANDLE:
                        bonus_multiplier += 1.0

        # Бонус Манежа
        if self.manege_bonus_active and current_time < self.manege_bonus_end_time:
            bonus_multiplier += 0.5

        # Бонус Ромашки (увеличивается каждый час)
        if building.type == BuildingType.ROMASHKA:
            hours_placed = (current_time - building.placement_time) / 3600000
            building.romashka_bonus = int(hours_placed) * 5
            bonus_additive += building.romashka_bonus

        return base_income * bonus_multiplier + bonus_additive

    def calculate_hourly_income(self):
        # Расчет дохода за час от всех зданий
        total_hourly = 0
        for building in self.buildings:
            if building.placed:
                total_hourly += building.base_points * 60  # очки в час
        return total_hourly

    def update_points(self):
        current_time = pygame.time.get_ticks()
        time_diff = current_time - self.last_update_time

        for building in self.buildings:
            if building.placed:
                income = self.calculate_building_income(building)
                self.total_points += income * (time_diff / 60000)  # Конвертация в минуты

        # Проверка бонуса Манежа
        if self.manege_bonus_active and current_time >= self.manege_bonus_end_time:
            self.manege_bonus_active = False

        self.last_update_time = current_time

    def spawn_new_buildings(self):
        current_time = pygame.time.get_ticks()
        if current_time - self.last_building_spawn >= self.building_spawn_interval:
            # Создание новых доступных зданий
            all_types = list(BuildingType)
            new_buildings = random.sample(all_types, min(3, len(all_types)))

            for building_type in new_buildings:
                building = Building(building_type)
                if building.placements_left > 0:
                    self.available_buildings.append(building)

            self.last_building_spawn = current_time

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False

            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # Левая кнопка мыши
                    self.handle_click(event.pos)

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r and self.selected_building:
                    # Поворот здания
                    self.selected_building.rotation = (self.selected_building.rotation + 60) % 360

        return True

    def handle_click(self, pos):
        x, y = pos

        # Проверка клика по доступным зданиям
        for i, building in enumerate(self.available_buildings):
            rect = pygame.Rect(10, 10 + i * 80, 200, 70)
            if rect.collidepoint(x, y):
                self.selected_building = building
                return

        # Проверка клика по сетке
        if x > 250:  # Игровое поле
            hex_coord = self.pixel_to_hex(x, y)
            if self.selected_building and self.can_place_building(self.selected_building, *hex_coord):
                if self.place_building(self.selected_building, *hex_coord):
                    self.buildings.append(self.selected_building)
                    self.available_buildings.remove(self.selected_building)

                    # Уменьшение количества доступных размещений
                    if self.selected_building.placements_left != float('inf'):
                        self.selected_building.placements_left -= 1
                        if self.selected_building.placements_left > 0:
                            new_building = Building(self.selected_building.type)
                            new_building.placements_left = self.selected_building.placements_left
                            self.available_buildings.append(new_building)

                    # Активация бонуса Манежа
                    if self.selected_building.type == BuildingType.MANEGE:
                        self.manege_bonus_active = True
                        self.manege_bonus_end_time = pygame.time.get_ticks() + 1200000  # 20 минут

                    self.selected_building = None

    def draw(self):
        self.screen.fill(BLACK)

        # Отрисовка сетки
        for q in range(-5, 6):
            for r in range(-5, 6):
                x, y = self.hex_to_pixel(q, r)
                if 0 <= x <= SCREEN_WIDTH and 0 <= y <= SCREEN_HEIGHT:
                    color = GRAY if (q, r) not in self.grid else self.grid[(q, r)].color
                    self.draw_hexagon(x, y, color)

        # Отрисовка размещенных зданий
        for building in self.buildings:
            if building.placed:
                for q, r in building.cells:
                    x, y = self.hex_to_pixel(q, r)
                    self.draw_hexagon(x, y, building.color)

        # Отрисовка выбранного здания (превью)
        if self.selected_building:
            mouse_x, mouse_y = pygame.mouse.get_pos()
            hex_coord = self.pixel_to_hex(mouse_x, mouse_y)
            if self.can_place_building(self.selected_building, *hex_coord):
                for dq, dr in self.selected_building.cell_pattern:
                    q, r = hex_coord[0] + dq, hex_coord[1] + dr
                    x, y = self.hex_to_pixel(q, r)
                    self.draw_hexagon(x, y, self.selected_building.color, alpha=128)

        # Отрисовка интерфейса
        self.draw_ui()

        pygame.display.flip()

    def draw_hexagon(self, x, y, color, alpha=255):
        points = []
        for i in range(6):
            angle_deg = 60 * i
            angle_rad = math.pi / 180 * angle_deg
            points.append((
                x + GRID_SIZE * math.cos(angle_rad),
                y + GRID_SIZE * math.sin(angle_rad)
            ))

        if alpha < 255:
            # Создание поверхности с альфа-каналом для прозрачности
            surface = pygame.Surface((GRID_SIZE * 2, GRID_SIZE * 2), pygame.SRCALPHA)
            pygame.draw.polygon(surface, (*color, alpha), [
                (p[0] - x + GRID_SIZE, p[1] - y + GRID_SIZE) for p in points
            ])
            self.screen.blit(surface, (x - GRID_SIZE, y - GRID_SIZE))
        else:
            pygame.draw.polygon(self.screen, color, points)
            pygame.draw.polygon(self.screen, BLACK, points, 2)

    def draw_ui(self):
        # Очки
        points_text = self.font.render(f"Очки: {int(self.total_points)}", True, WHITE)
        self.screen.blit(points_text, (10, SCREEN_HEIGHT - 40))

        # Доступные здания
        building_text = self.font.render("Доступные здания:", True, WHITE)
        self.screen.blit(building_text, (10, 10))

        for i, building in enumerate(self.available_buildings):
            y_pos = 50 + i * 80
            rect = pygame.Rect(10, y_pos, 200, 70)
            pygame.draw.rect(self.screen, building.color, rect)
            pygame.draw.rect(self.screen, WHITE, rect, 2)

            name_text = self.small_font.render(building.type.value, True, BLACK)
            points_text = self.small_font.render(f"{building.base_points} очков/мин", True, BLACK)

            self.screen.blit(name_text, (20, y_pos + 10))
            self.screen.blit(points_text, (20, y_pos + 35))

            if building.placements_left != float('inf'):
                count_text = self.small_font.render(f"Осталось: {building.placements_left}", True, BLACK)
                self.screen.blit(count_text, (20, y_pos + 50))

        # Подсказка
        if self.selected_building:
            hint_text = self.small_font.render("R - повернуть здание", True, WHITE)
            self.screen.blit(hint_text, (SCREEN_WIDTH - 200, SCREEN_HEIGHT - 30))

    def run(self):
        running = True
        while running:
            running = self.handle_events()

            self.update_points()
            self.spawn_new_buildings()
            self.draw()

            self.clock.tick(60)

        pygame.quit()
        sys.exit()


if __name__ == "__main__":
    game = Game()
    game.run()