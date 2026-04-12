# TO-DO
Добавление подзадач (POST /api/subtasks/)

Изменение задач (PATCH или PUT)

Удаление задач (DELETE /api/tasks/{id}/)
# Task Manager API: Documentation


---

## 1. Общие правила (Security & Base)

- **Base URL:** `http://localhost:8000`
- **Auth Strategy:** Token Authentication (Django REST Framework).
- **Required Headers:** Для всех защищенных запросов необходимо передавать заголовок:
  `Authorization: 'Token <ваш_токен>'`

---

## 👥 2. Аутентификация (Auth)

### 2.1 Регистрация
`POST /api/register/`

**Request Body (JSON):**
```json
{
    "username": "kadera",
    "email": "dev@example.com",
    "password": "strong_password_123"
}
```
**Success 201**: Пользователь создан

### 2.2 Получение токена (Логин)
`POST /api/login/`

**Request Body (JSON):**
```json
{
    "username": "kadera",
    "password": "strong_password_123"
}
```
**Response 200**:
```json
{
    "token": "9da0465a972e3360a8122c5b0410a152fd652ba8"
}
```
## Задачи (Tasks)
### 3.1 Список задач (List)
`GET /api/tasks/`
Возвращает только задачи текущего авторизованного пользователя

**Response:**
```json
[
    {
        "id": 1,
        "description": "Изучить CAP",
        "status": "new",
        "created_at": "2026-04-12T14:30:00Z",
        "owner_name": "kad",
        "subtasks": [],
        "images": [
            {
                "id": 1,
                "image_base64": "data:image/png;base64,iVBORw0K...",
                "task": 1
            }
        ]
    }
]
```
### 3.2 Создание задачи (Create)
`POST /api/tasks/`

Для передачи файлов используйте multipart/form-data

Key | Type | Description

description | string | Текст задачи (обязательно)

image | file | Объект файла изображения (опционально)
