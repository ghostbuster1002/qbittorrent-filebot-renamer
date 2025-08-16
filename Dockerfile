FROM node:20-bookworm-slim

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Enable non-free repositories for unrar
RUN echo "deb http://deb.debian.org/debian bookworm main non-free-firmware" > /etc/apt/sources.list.d/non-free.list \
    && echo "deb http://deb.debian.org/debian bookworm-updates main non-free-firmware" >> /etc/apt/sources.list.d/non-free.list \
    && echo "deb http://deb.debian.org/debian-security bookworm-security main non-free-firmware" >> /etc/apt/sources.list.d/non-free.list

# Install security updates and FileBot
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    dirmngr \
    gnupg \
    curl \
    apt-transport-https \
    ca-certificates \
    default-jre \
    mediainfo \
    p7zip-full \
    unrar \
    # Add FileBot repository with verification
    && curl -fsSL "https://raw.githubusercontent.com/filebot/plugins/master/gpg/maintainer.pub" | gpg --dearmor --output "/usr/share/keyrings/filebot.gpg" \
    && echo "deb [arch=all signed-by=/usr/share/keyrings/filebot.gpg] https://get.filebot.net/deb/ universal main" > "/etc/apt/sources.list.d/filebot.list" \
    # Update package index and install FileBot
    && apt-get update \
    && apt-get install -y --install-recommends filebot \
    # Security cleanup
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/* \
    && rm -rf /var/cache/apt/archives/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /filebot /downloads \
    && chown -R appuser:appuser /app /filebot /downloads

# Switch to non-root user
USER appuser

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/ || exit 1

# Expose port (can be overridden by environment variable)
EXPOSE ${PORT:-3000}

# Start the application
CMD ["npm", "start"]