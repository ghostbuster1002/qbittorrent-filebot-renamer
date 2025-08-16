# Security Policy

## Security Features

This application implements several security measures:

### Input Validation
- All user inputs are validated using Joi schemas
- File paths are sanitized to prevent path traversal attacks
- Torrent hashes are validated as 40-character alphanumeric strings

### Command Injection Protection
- Replaced `exec()` with `spawn()` for safer command execution
- All file paths are sanitized before being passed to FileBot
- Command arguments are passed as arrays, not concatenated strings

### Rate Limiting
- API endpoints are rate-limited to prevent abuse
- 100 requests per 15-minute window per IP address

### Security Headers
- Content Security Policy (CSP) implemented
- Helmet.js provides additional security headers
- HSTS, X-Frame-Options, and other protective headers

### Container Security
- Runs as non-root user in Docker container
- Read-only filesystem with specific writable tmpfs mounts
- Security options: no-new-privileges, proper health checks

### Error Handling
- Sensitive information is not exposed in error messages
- Proper logging for security events
- Request timeouts to prevent resource exhaustion

## Reporting Security Issues

If you discover a security vulnerability, please report it to the project maintainers.

## Security Checklist

- [ ] Change default qBittorrent credentials
- [ ] Use HTTPS for qBittorrent Web UI
- [ ] Restrict network access to qBittorrent
- [ ] Keep FileBot and dependencies updated
- [ ] Monitor logs for suspicious activity
- [ ] Use strong passwords and consider 2FA where possible