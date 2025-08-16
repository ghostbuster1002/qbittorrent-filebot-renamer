# qBittorrent FileBot Renamer

A containerized web application that integrates qBittorrent with FileBot to automatically rename TV shows and movies while preserving seeding capability.

## Features

- View all torrents with categories, tags, and file listings
- Select torrents for renaming (TV Shows or Movies)
- Generate rename suggestions using FileBot
- Apply renames via qBittorrent API to maintain seeding
- Responsive web interface
- Docker containerized for easy deployment

## Quick Start

1. Clone this repository
2. Copy `.env.example` to `.env` and configure your settings
3. Run with Docker Compose: `docker-compose up -d`
4. Access the web interface at `http://localhost:3745` (or your configured HOST_PORT)

## Configuration

Edit `.env` file with your settings:

### qBittorrent Configuration
- `QBITTORRENT_URL`: Your qBittorrent web UI URL
- `QBITTORRENT_USERNAME`: Web UI username  
- `QBITTORRENT_PASSWORD`: Web UI password

### Application Configuration
- `PORT`: Port the application runs on inside the container (default: 3000)
- `HOST_PORT`: Port exposed on your host machine (default: 3745)
- `NODE_ENV`: Environment mode (development/production)

### FileBot Configuration
- `FILEBOT_LICENSE_FILE`: Path to your FileBot license file on the host machine
- `FILEBOT_TV_DATABASE`: Database for TV shows (TheTVDB, AniDB, etc.)
- `FILEBOT_MOVIE_DATABASE`: Database for movies (TheMovieDB, etc.)
- `FILEBOT_TV_FORMAT`: Naming format for TV shows
- `FILEBOT_MOVIE_FORMAT`: Naming format for movies
- `FILEBOT_TIMEOUT_MS`: FileBot execution timeout

### Volume Paths
- `DOWNLOADS_PATH`: Path to downloads directory on host machine
- `FILEBOT_DATA_PATH`: Path to filebot data directory on host machine

### Performance & Security Settings
- Rate limiting, request size limits, and API timeout configurations
- See `.env.example` for complete list of configurable options

## Requirements

- Docker and Docker Compose
- qBittorrent with Web UI enabled
- FileBot license (for advanced features)

## Security Features

- Input validation and sanitization
- Command injection protection
- Rate limiting
- Security headers (CSP, HSTS, etc.)
- Non-root container execution
- Path traversal protection
- Request timeouts and proper error handling

