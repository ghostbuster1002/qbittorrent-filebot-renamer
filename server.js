const express = require('express');
const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests default
    message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware
const requestSizeLimit = process.env.REQUEST_SIZE_LIMIT || '10mb';
app.use(express.json({ limit: requestSizeLimit }));
app.use(express.urlencoded({ extended: true, limit: requestSizeLimit }));
app.use(cookieParser());
app.use(express.static('public'));

// qBittorrent API configuration
const QB_CONFIG = {
    baseURL: process.env.QBITTORRENT_URL,
    username: process.env.QBITTORRENT_USERNAME,
    password: process.env.QBITTORRENT_PASSWORD
};

let qbCookie = null;
let authRetryCount = 0;
const MAX_AUTH_RETRIES = parseInt(process.env.QB_MAX_AUTH_RETRIES) || 3;

// Input validation schemas
const schemas = {
    torrentHash: Joi.string().alphanum().length(40).required(),
    mediaType: Joi.string().valid('tv', 'movie').required(),
    renameRequest: Joi.object({
        torrentHash: Joi.string().alphanum().length(40).required(),
        renames: Joi.array().items(
            Joi.object({
                oldPath: Joi.string().max(parseInt(process.env.MAX_PATH_LENGTH) || 1000).required(),
                newPath: Joi.string().max(parseInt(process.env.MAX_PATH_LENGTH) || 1000).required()
            })
        ).max(parseInt(process.env.MAX_RENAME_BATCH_SIZE) || 100).required()
    })
};

// Utility functions
function sanitizePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
    }
    
    // Remove dangerous characters and normalize path
    const sanitized = path.normalize(filePath)
        .replace(/[;&|`$(){}[\]<>]/g, '')
        .replace(/\.\./g, '');
    
    if (sanitized.length === 0) {
        throw new Error('Invalid file path after sanitization');
    }
    
    return sanitized;
}

function validateInput(schema, data) {
    const { error, value } = schema.validate(data);
    if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
    }
    return value;
}

// qBittorrent API authentication
async function authenticateQB() {
    if (authRetryCount >= MAX_AUTH_RETRIES) {
        console.error('Max authentication retries exceeded');
        return false;
    }

    try {
        authRetryCount++;
        const response = await axios.post(`${QB_CONFIG.baseURL}/api/v2/auth/login`,
            `username=${encodeURIComponent(QB_CONFIG.username)}&password=${encodeURIComponent(QB_CONFIG.password)}`, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: parseInt(process.env.QB_AUTH_TIMEOUT_MS) || 10000
        });

        if (response.headers['set-cookie']) {
            qbCookie = response.headers['set-cookie'][0];
            authRetryCount = 0; // Reset on success
            return true;
        }
        return false;
    } catch (error) {
        console.error('qBittorrent authentication failed:', error.message);
        return false;
    }
}

// Make authenticated requests to qBittorrent
async function qbRequest(endpoint, method = 'GET', data = null, retryCount = 0) {
    const MAX_RETRIES = parseInt(process.env.QB_MAX_RETRIES) || 2;
    
    if (!qbCookie) {
        const authenticated = await authenticateQB();
        if (!authenticated) throw new Error('Failed to authenticate with qBittorrent');
    }

    try {
        const config = {
            method,
            url: `${QB_CONFIG.baseURL}/api/v2${endpoint}`,
            headers: { 'Cookie': qbCookie },
            timeout: parseInt(process.env.QB_REQUEST_TIMEOUT_MS) || 15000
        };

        if (data) {
            config.data = data;
            config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        return await axios(config);
    } catch (error) {
        if (error.response?.status === 403 && retryCount < MAX_RETRIES) {
            qbCookie = null;
            authRetryCount = 0; // Reset auth retry count
            return qbRequest(endpoint, method, data, retryCount + 1);
        }
        throw error;
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all torrents
app.get('/api/torrents', async (req, res) => {
    try {
        const response = await qbRequest('/torrents/info');
        const torrents = response.data;

        // Get additional info for each torrent
        const enrichedTorrents = await Promise.all(torrents.map(async (torrent) => {
            try {
                const [propsResponse, filesResponse] = await Promise.all([
                    qbRequest(`/torrents/properties?hash=${torrent.hash}`),
                    qbRequest(`/torrents/files?hash=${torrent.hash}`)
                ]);

                return {
                    ...torrent,
                    properties: propsResponse.data,
                    files: filesResponse.data
                };
            } catch (error) {
                console.error(`Error getting info for torrent ${torrent.hash}:`, error.message);
                return torrent;
            }
        }));

        res.json(enrichedTorrents);
    } catch (error) {
        console.error('Error fetching torrents:', error.message);
        res.status(500).json({ error: 'Failed to fetch torrents' });
    }
});

// Get FileBot rename suggestions
app.post('/api/filebot/suggest', async (req, res) => {
    try {
        // Validate input
        const { torrentHash, type } = validateInput(
            Joi.object({
                torrentHash: schemas.torrentHash,
                type: schemas.mediaType
            }),
            req.body
        );

        // Get torrent files
        const filesResponse = await qbRequest(`/torrents/files?hash=${torrentHash}`);
        const files = filesResponse.data;

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files found for this torrent' });
        }

        // Get torrent properties for save path
        const propsResponse = await qbRequest(`/torrents/properties?hash=${torrentHash}`);
        const savePath = propsResponse.data.save_path;

        if (!savePath) {
            return res.status(400).json({ error: 'Could not determine torrent save path' });
        }

        // Create FileBot command arguments safely
        const tvDatabase = process.env.FILEBOT_TV_DATABASE || 'TheTVDB';
        const movieDatabase = process.env.FILEBOT_MOVIE_DATABASE || 'TheMovieDB';
        const tvFormat = process.env.FILEBOT_TV_FORMAT || '{plex}';
        const movieFormat = process.env.FILEBOT_MOVIE_FORMAT || '{plex}';
        
        const db = type === 'tv' ? tvDatabase : movieDatabase;
        const format = type === 'tv' ? tvFormat : movieFormat;

        // Sanitize and validate file paths
        const sanitizedFiles = files.map(file => {
            try {
                const sanitizedName = sanitizePath(file.name);
                return path.join(savePath, sanitizedName);
            } catch (error) {
                console.error(`Skipping invalid file: ${file.name}`);
                return null;
            }
        }).filter(Boolean);

        if (sanitizedFiles.length === 0) {
            return res.status(400).json({ error: 'No valid files found after sanitization' });
        }

        // Use spawn instead of exec for security
        const args = [
            '-rename',
            ...sanitizedFiles,
            '--db', db,
            '--format', format,
            '--action', 'test',
            '-non-strict'
        ];

        const filebot = spawn('filebot', args, {
            timeout: parseInt(process.env.FILEBOT_TIMEOUT_MS) || 30000,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        filebot.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        filebot.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        filebot.on('close', (code) => {
            if (code !== 0) {
                console.error('FileBot error:', stderr);
                return res.status(500).json({ 
                    error: 'FileBot execution failed', 
                    details: 'FileBot process failed. Check server logs.' 
                });
            }

            try {
                const suggestions = parseFileBotOutput(stdout);
                res.json({ suggestions, output: stdout });
            } catch (parseError) {
                console.error('Error parsing FileBot output:', parseError);
                res.status(500).json({ error: 'Failed to parse FileBot output' });
            }
        });

        filebot.on('error', (error) => {
            console.error('FileBot spawn error:', error);
            res.status(500).json({ error: 'Failed to execute FileBot' });
        });

    } catch (error) {
        console.error('Error generating suggestions:', error.message);
        if (error.message.includes('Validation error')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to generate suggestions' });
        }
    }
});

// Apply rename using qBittorrent API
app.post('/api/torrents/rename', async (req, res) => {
    try {
        // Validate input
        const { torrentHash, renames } = validateInput(schemas.renameRequest, req.body);

        if (renames.length === 0) {
            return res.status(400).json({ error: 'No renames provided' });
        }

        // Validate and sanitize paths
        const validRenames = [];
        for (const rename of renames) {
            try {
                const sanitizedOldPath = sanitizePath(rename.oldPath);
                const sanitizedNewPath = sanitizePath(rename.newPath);
                
                // Additional validation - ensure paths don't try to escape
                if (sanitizedOldPath.includes('..') || sanitizedNewPath.includes('..')) {
                    console.warn(`Skipping potentially dangerous rename: ${rename.oldPath} -> ${rename.newPath}`);
                    continue;
                }
                
                validRenames.push({
                    oldPath: sanitizedOldPath,
                    newPath: sanitizedNewPath
                });
            } catch (error) {
                console.warn(`Skipping invalid rename: ${rename.oldPath} -> ${rename.newPath}`);
            }
        }

        if (validRenames.length === 0) {
            return res.status(400).json({ error: 'No valid renames after sanitization' });
        }

        // Apply each rename with error handling
        const results = [];
        for (const rename of validRenames) {
            try {
                const data = `hash=${torrentHash}&oldPath=${encodeURIComponent(rename.oldPath)}&newPath=${encodeURIComponent(rename.newPath)}`;
                await qbRequest('/torrents/renameFile', 'POST', data);
                results.push({ success: true, oldPath: rename.oldPath, newPath: rename.newPath });
            } catch (error) {
                console.error(`Failed to rename ${rename.oldPath}:`, error.message);
                results.push({ success: false, oldPath: rename.oldPath, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        res.json({ 
            success: failureCount === 0,
            message: `${successCount} files renamed successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
            results
        });
    } catch (error) {
        console.error('Error renaming files:', error.message);
        if (error.message.includes('Validation error')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to rename files' });
        }
    }
});

// Parse FileBot output to extract rename suggestions
function parseFileBotOutput(output) {
    if (!output || typeof output !== 'string') {
        return [];
    }

    const suggestions = [];
    const lines = output.split('\n');

    for (const line of lines) {
        if (line.includes(' -> ')) {
            try {
                const [oldPath, newPath] = line.split(' -> ').map(p => p.trim());
                if (oldPath && newPath) {
                    // Clean up the paths
                    const cleanOldPath = oldPath.replace(/^\[TEST\]\s*/, '').trim();
                    const cleanNewPath = newPath.trim();
                    
                    // Basic validation
                    if (cleanOldPath.length > 0 && cleanNewPath.length > 0) {
                        suggestions.push({
                            oldPath: cleanOldPath,
                            newPath: cleanNewPath
                        });
                    }
                }
            } catch (error) {
                console.warn(`Failed to parse line: ${line}`);
            }
        }
    }

    return suggestions;
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the web interface at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});