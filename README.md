# Daylight Todo

A small full-stack todo app built with React, Tailwind CSS, react-hot-toast, Express, Mongoose and MongoDB. Create, complete, filter and delete tasks. Docker Compose runs Nginx, the API and MongoDB on one shared bridge network, and stores MongoDB data in a named volume. Nginx serves the compiled React app directly and forwards `/api` requests to the API container.

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Docker Compose (recommended), or Node.js 22+ and npm.
- A local MongoDB instance only if you choose to run the app without Docker.

## Project structure

```text
SimpleDocker/
├── backend/                 # Express API, Mongoose model and API tests
├── frontend/                # React app, Tailwind styles and UI tests
├── nginx/default.conf       # Public Nginx reverse-proxy configuration
├── .github/workflows/ci.yml # GitHub Actions checks
├── .dockerignore
├── docker-compose.yml
├── .env.example
└── README.md
```

## Run with Docker Desktop (Windows CMD)

All commands in this section should be run in **Command Prompt (CMD)**, from the project root unless another folder is shown.

### 1. Install and start Docker

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/), launch it, and wait until Docker reports that its Engine is running. Then open CMD and check that Docker and Compose are available:

```cmd
docker --version
docker compose version
```

### 2. Open the project folder

```cmd
cd /d C:\Workstation\Training\Docker\SimpleDocker
```

### 3. Create the environment file (first run only)

```cmd
copy .env.example .env
```

The `.env` file configures MongoDB credentials and the public Nginx host port. The defaults are for a local demo; change `MONGO_ROOT_PASSWORD` before exposing services to other machines. Do not commit `.env` to Git. `NGINX_PORT` defaults to `80`; change it (for example, to `8080`) if port 80 is already occupied.

### 4. Validate the Compose configuration (optional, recommended)

```cmd
docker compose config
```

This checks and prints the resolved Compose configuration. It does not start containers.

### 5. Build images and start all services

```cmd
docker compose up --build -d
```

Docker Compose builds the API image and the Nginx image (which also builds the React frontend), downloads the MongoDB image if needed, creates the containers, and automatically creates:

- The shared bridge network `todo_network`, connecting `nginx`, `api` and `mongo` so the containers can communicate with each other.
- The `mongo_data` named volume declared in `docker-compose.yml`, which stores MongoDB data outside the container's writable layer.

You do not need to run `docker network create` or `docker volume create` yourself. Nginx serves the frontend files from its own image and forwards `/api/` to `api:5000`; the API connects to MongoDB at `mongo:27017` over the shared network.

### 6. Check that the services are running

```cmd
docker compose ps
docker volume ls
docker network ls
docker network inspect todo_network
docker compose logs -f
```

Press `Ctrl+C` to stop following logs; this does not stop the containers. To view only API or database logs, run:

```cmd
docker compose logs -f nginx
docker compose logs -f api
docker compose logs -f mongo
```

Open **http://localhost** in your browser. The API health endpoint is **http://localhost/api/health**. Both go through the public Nginx container; the API does not publish a host port directly. If you changed `NGINX_PORT` to `8080`, use `http://localhost:8080` and `http://localhost:8080/api/health` instead.

## Docker commands you may need later

Run these from the project root (`C:\Workstation\Training\Docker\SimpleDocker`).

| Task | CMD command |
| --- | --- |
| Show container status | `docker compose ps` |
| Follow all service logs | `docker compose logs -f` |
| Follow API logs | `docker compose logs -f api` |
| Follow Nginx logs | `docker compose logs -f nginx` |
| Restart all services | `docker compose restart` |
| Restart one service | `docker compose restart api` |
| Rebuild images and apply code/Dockerfile changes | `docker compose up --build -d` |
| Stop and remove containers/network, keeping database data | `docker compose down` |
| Start again without rebuilding | `docker compose up -d` |
| List Docker volumes | `docker volume ls` |
| List Docker networks | `docker network ls` |
| Inspect the shared Compose network | `docker network inspect todo_network` |

`docker compose down` keeps the `mongo_data` volume, so tasks remain saved. To remove the containers **and permanently erase the MongoDB data volume**, run this only when you really want a fresh database:

```cmd
docker compose down -v
```

The next `docker compose up --build -d` will create a new empty volume and the shared network automatically. You normally should not create or delete either manually. If you need to inspect them, use `docker volume ls` and `docker network ls`; the explicitly named network is `todo_network`.

### Optional: build or start only one service

```cmd
docker compose build api
docker compose up -d mongo
docker compose up -d api
docker compose up -d nginx
```

The API depends on MongoDB becoming healthy. Nginx serves the frontend and proxies API requests, so start all services with `docker compose up --build -d` for normal use.

## Services

| Service | Purpose | Local address |
| --- | --- | --- |
| nginx | Serves the React + Tailwind production build and reverse-proxies `/api` | http://localhost (port configurable with `NGINX_PORT`) |
| api | Express REST API | Internal: `api:5000` |
| mongo | MongoDB 8 database | Internal: `mongo:27017` |

All three services join the same user-defined bridge network (`todo_network`). Docker's internal DNS resolves service names on this network. Only Nginx publishes a host port; browser API calls use the same-origin `/api` path, which Nginx forwards internally to the API. The frontend is built into the Nginx image, so there is no separate frontend runtime container.

API endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API health and MongoDB connection status |
| GET | `/api/todos` | List tasks |
| POST | `/api/todos` | Create a task (title is required, maximum 160 characters) |
| PATCH | `/api/todos/:id` | Update a task title and/or completion state |
| DELETE | `/api/todos/:id` | Delete a task |

## Run tests locally

These commands run tests directly on Windows, outside Docker. Open CMD and run the backend tests:

```cmd
cd /d C:\Workstation\Training\Docker\SimpleDocker\backend
npm ci
npm test
```

The API tests mock the Mongoose model methods, so you do not need to start Docker or MongoDB to run them. They exercise the Express HTTP routes, request validation, response codes and JSON payloads; they do not test persistence against a live database.

Then run the frontend tests and production build:

```cmd
cd /d C:\Workstation\Training\Docker\SimpleDocker\frontend
npm ci
npm test
npm run build
```

## GitHub Actions CI

The workflow in `.github/workflows/ci.yml` runs automatically on pushes and pull requests targeting `main` or `master`. It uses Node.js 22 and runs the API route tests, frontend component tests and frontend production build in separate jobs. You can also start it manually from the repository's **Actions** tab using **Todo App CI → Run workflow**.

The current test suite contains 7 API route tests and 5 frontend interaction tests.

To publish this project to GitHub, create an empty repository on GitHub, then run these commands from the project folder (replace the URL with your repository URL):

```cmd
cd /d C:\Workstation\Training\Docker\SimpleDocker
git init
git add .
git commit -m "Build Daylight todo app with tests and CI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

After the push, open the repository's **Actions** tab to see both CI jobs and their results. A green workflow run means both test jobs and the frontend build passed.

## Run without Docker (optional)

You need Node.js 22+ and a local MongoDB instance running at `mongodb://127.0.0.1:27017/todo_app` (the backend's default connection string). Start MongoDB first. Open the first CMD window and run:

```cmd
cd /d C:\Workstation\Training\Docker\SimpleDocker\backend
npm install
npm run dev
```

Open a second CMD window and run (Vite proxies `/api` to the local API on port 5000):

```cmd
cd /d C:\Workstation\Training\Docker\SimpleDocker\frontend
npm install
npm run dev
```

The Vite development server prints its local URL (normally http://localhost:5173).

