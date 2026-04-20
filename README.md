# TO-DO

# Как тестировать
1. **Скачать Docker Desktop:**
   - [Для Windows](https://www.docker.com/products/docker-desktop/)
   - [Для macOS](https://docs.docker.com/desktop/install/mac-install/)
   - [Для Linux](https://docs.docker.com/desktop/install/linux-install/)

2. **Проверка установки:**
   Откройте терминал и выполните:
   ```bash
   docker --version
  docker compose version
   ```
3. **Запуск:** 
Клонируйте репозиторий и выполните следующие команды в корне проекта:

```bash
# Сборка и запуск контейнеров
make up
# При первом запуске: создание базы данных и миграций
make setup
# Для выключения
make down
```
---

## 1. Общие правила (Security & Base)

- **Base URL:** `http://localhost:8000`
- **Auth Strategy:** Token Authentication (Django REST Framework).
- **Required Headers:** Для всех защищенных запросов необходимо передавать заголовок:
- **CORS:** Разрешен для http://localhost:4200 (Angular default).
  `Authorization: 'Token <ваш_токен>'`

---

# 🚀 API Reference Guide

### 🔑 Аутентификация
**Заголовок для всех запросов (кроме регистрации и логина):** `Authorization: Token <ваш_токен>`

---

### 1. Аккаунт и Доступ
| Метод | Эндпоинт | Описание                      | Payload (JSON) | Ответ (Success) |
| :--- | :--- |:------------------------------| :--- | :--- |
| **POST** | `/api/register/` | Создание нового пользователя  | `{"username", "email", "password"}` | `201` + данные юзера |
| **POST** | `/api/login/` | логина-пароль                 | `{"username", "password"}` | `200` + `{"token": "..."}` |
| **POST** | `/api/logout/` | Аннулирование текущего токена | (пусто) | `204 No Content` |

---

### 2. Задачи (Tasks)
*Все операции фильтруются по `owner=request.user` (вы видите и меняете только свой задачи)*

| Метод | Эндпоинт | Действие | Payload (JSON) | Ответ |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/tasks/` | Получить список всех своих задач | (пусто) | `200` + Список объектов Task |
| **POST** | `/api/tasks/` | Создать новую задачу | `{"description", "status", "due_date?", "due_time?"}` | `201` + Созданный объект |
| **GET** | `/api/tasks/<id>/` | Детали задачи (+ подзадачи и фото) | (пусто) | `200` + Объект Task |
| **PATCH** | `/api/tasks/<id>/` | Частично изменить задачу | `{"status": "completed", "due_date": "2026-04-21", "due_time": "14:30:00"}` | `200` + Обновленный объект |
| **DELETE** | `/api/tasks/<id>/` | Удалить задачу | (пусто) | `204 No Content` |

**Структура объекта Task:**
```json
{
    "id": 1,
    "description": "Текст",
    "status": "new", // или 'in_progress', 'completed'
    "due_date": "2026-04-21", // опционально, формат YYYY-MM-DD
    "due_time": "14:30:00", // опционально, формат HH:MM:SS
    "owner_name": "user1",
    "subtasks": [...], 
    "images": [...]
}
```

### 🖇️ Подзадачи (SubTasks)
Эндпоинт: `/api/subtasks/` — требует авторизацию типа такого(Token 3eabea590)

| Метод | Действие | Ожидаемый Payload (JSON) | Ответ (Success) | Логика защиты |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | Список всех ваших подзадач | (пусто) | `200 OK` + Массив объектов | Видит только те подзадачи, чьи родители (Tasks) принадлежат вам. |
| **POST** | Создать подзадачу | `{"task_id": int, "description": "str", "status": "str"}` | `201 Created` | Вернет `403 Forbidden`, если попытаться привязать подзадачу к чужому `task_id`. |
| **PATCH** | Изменить подзадачу | `{"description": "new text", "status": "completed"}` | `200 OK` | Позволяет менять только описание и статус. Перенос в другой `task_id` игнорируется. |
| **DELETE** | Удалить подзадачу | (пусто) | `204 No Content` | Удаляет только если подзадача найдена в списке ваших задач. |

**Пример объекта SubTask (JSON):**
{
    "id": 42,
    "description": "Написать тесты для контроллера",
    "status": "in_progress" 
}