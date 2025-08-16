# Technology Stack

## Backend
- **Runtime**: Node.js 18+ (specified in package.json engines)
- **Framework**: Express.js 4.x
- **Module System**: CommonJS (require/module.exports)

## Key Dependencies
- **HTTP Client**: axios for qBittorrent API communication
- **Security**: helmet, express-rate-limit, cors
- **Validation**: joi for input validation
- **Environment**: dotenv for configuration
- **Parsing**: cookie-parser for session management

## Frontend
- **Architecture**: Vanilla JavaScript ES6+ classes
- **UI Pattern**: Single-page application with modal dialogs
- **Styling**: Pure CSS with CSS Grid and Flexbox
- **No frameworks**: No React, Vue, or other frontend frameworks

## External Integrations
- **qBittorrent**: Web API for torrent management
- **FileBot**: Command-line tool executed via Node.js spawn
- **Docker**: Containerized deployment with docker-compose

## Development Tools
- **Dev Server**: nodemon for development
- **Package Manager**: npm (lockfile present)
- **Container**: Docker with Debian bookworm-slim base

## Common Commands

### Development
```bash
npm run dev          # Start with nodemon for development
npm start           # Production start
npm run security-audit  # Security vulnerability check
npm run update-deps     # Update dependencies
```

### Docker Operations
```bash
docker-compose up -d    # Start containerized application
docker-compose down     # Stop and remove containers
docker-compose logs -f  # View application logs
```

### Environment Setup
```bash
cp .env.example .env    # Create environment configuration
# Edit .env with your qBittorrent and FileBot settings
```

## Security Practices
- Input validation with joi schemas
- Path sanitization for file operations
- Rate limiting on API endpoints
- Security headers via helmet
- Non-root container execution
- Command injection protection using spawn instead of exec