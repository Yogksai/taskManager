up:
	docker compose --env-file backend/.env up --build -d
down:
	docker compose down
clean:
	docker compose down -v --rmi local
setup:
	docker compose exec backend python manage.py makemigrations
	docker compose exec backend python manage.py migrate
npm-install:
	docker compose exec frontend npm install
shell:
	docker compose exec backend /bin/bash