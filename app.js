/**
 * FFmpeg Web Service API
 * 
 * Un servicio web para convertir archivos de audio/video usando Node.js, Express y FFmpeg.
 * Basado en jrottenberg/ffmpeg 6.0 con Ubuntu 22.04.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const compression = require('compression');
const winston = require('winston');
const consts = require('./app/constants.js');
const endpoints = require('./app/endpoints.js');
const services = require('./app/services');

// Inicializar Express
const app = express();
app.use(compression());

// Configurar CORS para permitir solicitudes desde orígenes específicos
app.use(function(req, res, next) {
    // Lista de orígenes permitidos
    const allowedOrigins = [
        'https://talent-flow.technexus.com.mx',
        'http://localhost:8080',
        'http://localhost:3000'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    // Permitir métodos y cabeceras específicos
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Manejar solicitudes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Configurar logging
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {'timestamp': true});

// Asegurar que el directorio de uploads existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Endpoint para listar endpoints disponibles
app.get('/endpoints', function(req, res) {
    const availableEndpoints = services.FFmpegService.getEndpointsList(endpoints);
    res.json(availableEndpoints);
    
    // Configurar los endpoints de conversión
    setupEndpoints(availableEndpoints);
});

// Función para configurar un endpoint de conversión
function setupConversionEndpoint(path, ffmpegParams) {
    app.post(path, function(req, res) {
        services.FFmpegService.processConversionRequest(
            req, 
            res, 
            ffmpegParams, 
            uploadsDir, 
            consts.fileSizeLimit
        ).catch(error => {
            winston.error(JSON.stringify({
                type: 'unhandled_error',
                path: path,
                message: error.toString()
            }));
            
            // Asegurar que enviamos una respuesta si no se ha enviado ya
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Internal server error',
                    message: 'An unexpected error occurred'
                });
            }
        });
    });
}

// Configurar endpoints
function setupEndpoints(availableEndpoints) {
    // Configurar los endpoints de conversión basados en la lista
    availableEndpoints.forEach(endpoint => {
        if (endpoint.methods.includes('POST')) {
            const path = endpoint.path;
            let propName;
            
            // Determinar el nombre de la propiedad en el objeto endpoints.types
            if (path.startsWith('/video/compress/to/')) {
                const format = path.split('/').pop();
                if (format === 'mp4' || format === 'webm') {
                    propName = `compress-${format}`;
                } else {
                    propName = format; // Para hevc y av1
                }
            } else if (path.startsWith('/convert/')) {
                const format = path.split('/').pop();
                propName = format;
            } else if (path.startsWith('/')) {
                propName = path.substring(1); // Quitar el slash inicial
            }
            
            // Si encontramos la propiedad, configurar el endpoint
            if (propName && endpoints.types[propName]) {
                setupConversionEndpoint(path, endpoints.types[propName]);
            }
        }
    });
    
    // Configurar endpoints cortos (retrocompatibilidad)
    for (let prop in endpoints.types) {
        if (endpoints.types.hasOwnProperty(prop)) {
            setupConversionEndpoint('/' + prop, endpoints.types[prop]);
        }
    }
}

// Configurar endpoints para la documentación
require('express-readme')(app, {
    filename: 'README.md',
    routes: ['/', '/readme'],
});

// Iniciar el servidor
const server = app.listen(consts.port, function() {
    const host = server.address().address;
    const port = server.address().port;
    winston.info(JSON.stringify({
        action: 'listening',
        url: 'http://'+host+':'+port,
    }));
});

// Configurar timeouts para conexiones
server.on('connection', function(socket) {
    winston.info(JSON.stringify({
        action: 'new connection',
        timeout: consts.timeout,
    }));
    socket.setTimeout(consts.timeout);
    socket.server.timeout = consts.timeout;
    server.keepAliveTimeout = consts.timeout;
});

// Middleware para rutas no encontradas
app.use(function(req, res, next) {
    res.status(404).json({
        error: 'Route not available',
        path: req.path,
        method: req.method
    });
});

// Manejador global de errores
app.use(function(err, req, res, next) {
    winston.error(JSON.stringify({
        type: 'express_error',
        path: req.path,
        method: req.method,
        message: err.toString()
    }));
    
    res.status(500).json({
        error: 'Internal server error',
        message: err.message || 'An unexpected error occurred'
    });
});
