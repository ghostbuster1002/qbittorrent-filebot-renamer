# Project Structure

## Root Directory Layout
```
├── server.js              # Main Express application entry point
├── package.json           # Node.js dependencies and scripts
├── package-lock.json      # Locked dependency versions
├── .env.example          # Environment configuration template
├── Dockerfile            # Container build instructions
├── docker-compose.yml    # Multi-container orchestration
├── README.md             # Project documentation
├── SECURITY.md           # Security guidelines
└── .gitignore           # Git ignore patterns
```

## Frontend Assets (`/public/`)
```
public/
├── index.html           # Main HTML template
├── script.js           # Frontend JavaScript application
└── styles.css          # CSS styling (no preprocessors)
```

## Configuration Files
- **`.env.example`**: Template for environment variables with all required settings
- **`docker-compose.yml`**: Production deployment configuration
- **`Dockerfile`**: Multi-stage container build with security hardening

## Key Architectural Patterns

### Backend Structure
- **Single file application**: All Express routes and logic in `server.js`
- **Middleware stack**: Security, parsing, rate limiting applied globally
- **API routes**: RESTful endpoints under `/api/` prefix
- **Static serving**: Public directory served at root

### Frontend Structure
- **Class-based architecture**: Single `QBTFileBotApp` class manages entire frontend
- **Modal-based UI**: Torrent details displayed in overlay modals
- **Grid layout**: Responsive card-based torrent display
- **No build process**: Direct browser-compatible JavaScript

### File Organization Principles
- **Minimal structure**: Keep files at root level when possible
- **Clear separation**: Backend (server.js) and frontend (public/) clearly divided
- **Configuration centralized**: All environment settings in single .env file
- **Docker-first**: All deployment concerns handled via containers

### Naming Conventions
- **Files**: kebab-case for multi-word files (`docker-compose.yml`)
- **JavaScript**: camelCase for variables and functions
- **CSS classes**: kebab-case with BEM-like patterns
- **API endpoints**: RESTful paths (`/api/torrents`, `/api/filebot/suggest`)

### Security Considerations
- **Input validation**: All user inputs validated with joi schemas
- **Path sanitization**: File paths cleaned to prevent traversal attacks
- **Container security**: Non-root user, read-only filesystem, security options
- **API protection**: Rate limiting, CORS, security headers