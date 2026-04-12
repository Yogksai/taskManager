up:
	docker-compose --env-file backend/.env up --build -d
down:
	docker-compose down
setup:
	docker-compose exec backend python manage.py makemigrations
	docker-compose exec backend python manage.py migrate
	docker-compose exec backend python manage.py createsuperuser
logs:
	docker-compose logs -f backend
shell:
	docker-compose exec backend /bin/bash