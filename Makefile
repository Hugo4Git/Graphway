.PHONY: up down logs

# Start the application
up:
	docker compose -f deployment/docker-compose.yml up --build --attach access-printer

# Stop the application
down:
	docker compose -f deployment/docker-compose.yml down

# View logs
logs:
	docker compose -f deployment/docker-compose.yml logs -f
