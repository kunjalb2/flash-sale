.PHONY: help install dev test lint format migrate upgrade rollback celery celery-beat flower

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	pip install -e ".[dev]"

dev: ## Run development server
	uvicorn seatflow.web.application:get_app --factory --reload --host 0.0.0.0 --port 8000

test: ## Run tests
	pytest -v

test-cov: ## Run tests with coverage
	pytest --cov=seatflow --cov-report=html --cov-report=term-missing

lint: ## Run linter
	ruff check .

format: ## Format code
	ruff format .

migrate: ## Create new migration (use MSG="message")
	alembic revision --autogenerate -m "$(MSG)"

upgrade: ## Apply database migrations
	alembic upgrade head

rollback: ## Rollback one migration
	alembic downgrade -1

docker-up: ## Start all Docker services
	docker-compose up -d

docker-down: ## Stop all Docker services
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

celery: ## Start Celery worker
	celery -A seatflow.tasks.celery_app worker --loglevel=info

celery-beat: ## Start Celery beat
	celery -A seatflow.tasks.celery_app beat --loglevel=info

flower: ## Start Flower dashboard
	celery -A seatflow.tasks.celery_app flower

clean: ## Clean Python cache files
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
