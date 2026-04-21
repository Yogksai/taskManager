COMPOSE := $(shell if docker compose version >/dev/null 2>&1; then echo "docker compose"; elif docker-compose --version >/dev/null 2>&1; then echo "docker-compose"; fi)

check-compose:
	@if [ -z "$(COMPOSE)" ]; then \
		echo "Docker Compose not found. Install Docker Compose v2 ('docker compose') or legacy docker-compose."; \
		exit 1; \
	fi

up: check-compose
	$(COMPOSE) --env-file backend/.env up --build -d

down: check-compose
	$(COMPOSE) down

setup: check-compose
	$(COMPOSE) exec backend python manage.py makemigrations
	$(COMPOSE) exec backend python manage.py migrate
	$(COMPOSE) exec backend python manage.py createsuperuser

logs: check-compose
	$(COMPOSE) logs -f backend

shell: check-compose
	$(COMPOSE) exec backend /bin/bash