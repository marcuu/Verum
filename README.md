# Verum

A personal journal and quotes API built with Flask.

## Features

- **Journal API**: Create, read, update, and delete daily journal entries
- **Quotes API**: Manage a collection of quotes with voting and daily pick functionality
- Token-based authentication
- Multi-origin CORS support
- Rate limiting
- SQLite storage

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your settings
```

At minimum, set `JOURNAL_ACCESS_TOKEN` to a secure secret value.

### 3. Run the server

```bash
python server.py
```

The server will start on port 8080 by default.

## API Endpoints

### Journal

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/journal/api/entries` | List all entries |
| GET | `/journal/api/entries/<day>` | Get entry for a specific day |
| POST | `/journal/api/entries` | Create/update an entry |
| DELETE | `/journal/api/entries/<day>` | Delete an entry |
| GET | `/journal/api/export.json` | Export all entries as JSON |

### Quotes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/journal/api/quotes` | List all quotes |
| POST | `/journal/api/quotes` | Create a new quote |
| GET | `/journal/api/quotes/daily` | Get the daily quote |
| POST | `/journal/api/quotes/<id>/vote` | Vote on a quote (+1 or -1) |
| DELETE | `/journal/api/quotes/<id>` | Delete a quote |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/healthz` | Health check endpoint |

## Authentication

Include your access token in the `X-Access-Token` header:

```bash
curl -H "X-Access-Token: your-token" https://yourserver.com/journal/api/entries
```

## Environment Variables

See `.env.example` for all available configuration options.

## License

MIT
