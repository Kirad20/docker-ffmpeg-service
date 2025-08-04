/**
 * Servicio principal de FFmpeg
 * 
 * Este servicio centraliza y coordina todas las operaciones de conversión,
 * integrando los servicios de subida, archivos y conversión.
 */

const path = require('path');
const winston = require('winston');
const UploadService = require('./uploadService');
const ConversionService = require('./conversionService');
const FileService = require('./fileService');

class FFmpegService {
    /**
     * Procesa una solicitud de conversión completa
     * 
     * @param {Object} req - Objeto request de Express
     * @param {Object} res - Objeto response de Express
     * @param {Object} ffmpegParams - Parámetros de FFmpeg
     * @param {string} uploadDir - Directorio de subida
     * @param {number} fileSizeLimit - Límite de tamaño de archivo
     * @returns {Promise} - Promesa que se resuelve cuando se completa el proceso
     */
    static processConversionRequest(req, res, ffmpegParams, uploadDir, fileSizeLimit) {
        winston.info(JSON.stringify({
            action: 'process_request',
            path: req.path,
            origin: req.headers.origin || 'No origin header',
            contentType: req.headers['content-type'] || 'No content-type header'
        }));
        
        return new Promise((resolve, reject) => {
            // Procesar la subida del archivo
            UploadService.processUpload(req, {
                fileSizeLimit,
                uploadDir,
                onError: (err, statusCode) => {
                    // Asegurar que las cabeceras CORS se envían en error
                    this.setCORSHeaders(req, res);
                    
                    res.status(statusCode || 500).json({
                        error: 'Upload failed',
                        message: err.toString()
                    });
                    reject(err);
                }
            })
            .then(uploadResult => {
                // Archivo subido correctamente, proceder con la conversión
                const { originalName, savedPath } = uploadResult;
                const outputFile = `${savedPath}.${ffmpegParams.extension}`;
                
                // Convertir el archivo
                return ConversionService.convertFile({
                    inputFile: savedPath,
                    outputFile,
                    fileName: originalName,
                    outputOptions: ffmpegParams.outputOptions,
                    extension: ffmpegParams.extension,
                    onSuccess: (outputFilePath, fileName, extension) => {
                        // Enviar el archivo al cliente
                        this.sendFileToClient(res, outputFilePath, fileName, extension, resolve, reject);
                    },
                    onError: (err, statusCode) => {
                        // Asegurar que las cabeceras CORS se envían en error
                        this.setCORSHeaders(req, res);
                        
                        res.status(statusCode || 500).json({
                            error: 'Conversion failed',
                            message: err.toString()
                        });
                        reject(err);
                    },
                    onProgress: (progress) => {
                        // Puedes implementar eventos de servidor o websockets aquí
                        // para informar al cliente sobre el progreso en tiempo real
                        winston.info(JSON.stringify({
                            action: 'conversion_progress',
                            percent: progress.percent,
                            frames: progress.frames,
                            fps: progress.currentFps
                        }));
                    }
                });
            })
            .catch(err => {
                winston.error(JSON.stringify({
                    type: 'process_error',
                    message: err.toString()
                }));
                
                // Asegurarse de que no enviamos múltiples respuestas
                if (!res.headersSent) {
                    // Asegurar que las cabeceras CORS se envían en error
                    this.setCORSHeaders(req, res);
                    
                    res.status(500).json({
                        error: 'Process failed',
                        message: err.toString()
                    });
                }
                reject(err);
            });
        });
    }
    
    /**
     * Establece las cabeceras CORS para una respuesta
     * 
     * @param {Object} req - Objeto request de Express
     * @param {Object} res - Objeto response de Express
     */
    static setCORSHeaders(req, res) {
        if (res.headersSent) return;
        
        const origin = req.headers.origin;
        if (origin) {
            const allowedOrigins = [
                'https://talent-flow.technexus.com.mx',
                'http://localhost:8080',
                'http://localhost:3000',
                'https://localhost:8080',
                'https://127.0.0.1:8080',
                'http://127.0.0.1:8080'
            ];
            
            if (allowedOrigins.includes(origin)) {
                res.header('Access-Control-Allow-Origin', origin);
                res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                res.header('Access-Control-Allow-Credentials', 'true');
            }
        }
    }

    /**
     * Envía el archivo convertido al cliente
     * 
     * @param {Object} res - Objeto response de Express
     * @param {string} filePath - Ruta al archivo a enviar
     * @param {string} originalName - Nombre original del archivo
     * @param {string} extension - Extensión del archivo
     * @param {Function} resolve - Resolver la promesa
     * @param {Function} reject - Rechazar la promesa
     */
    static sendFileToClient(res, filePath, originalName, extension, resolve, reject) {
        winston.info(JSON.stringify({
            action: 'starting download to client',
            file: filePath
        }));

        // Construir nombre de archivo para descarga
        const downloadName = originalName.replace(/\.[^/.]+$/, '') + '.' + extension;

        // Asegurarse de que no hay problemas CORS
        if (!res.headersSent) {
            this.setCORSHeaders(res.req, res);
        }

        // Enviar el archivo
        res.download(filePath, downloadName, (err) => {
            // Limpiar archivo después de enviarlo (o si hay error)
            FileService.deleteFile(filePath);
            
            if (err) {
                winston.error(JSON.stringify({
                    type: 'download',
                    message: err.toString()
                }));
                reject(err);
            } else {
                resolve({
                    success: true,
                    file: downloadName
                });
            }
        });
    }

    /**
     * Obtiene información sobre los endpoints disponibles
     * 
     * @param {Object} endpoints - Configuración de endpoints
     * @returns {Array} - Lista de endpoints formateados
     */
    static getEndpointsList(endpoints) {
        const availableEndpoints = [];
        
        // Procesar endpoints de conversión
        for (let prop in endpoints.types) {
            if (endpoints.types.hasOwnProperty(prop)) {
                let path = '';
                const type = endpoints.types[prop];
                
                // Formato basado en el tipo
                if (prop.startsWith('compress-')) {
                    // Endpoints de compresión
                    const format = prop.split('-')[1];
                    path = `/video/compress/to/${format}`;
                } else if (prop === 'hevc' || prop === 'av1') {
                    // Codecs de video avanzados
                    path = `/video/compress/to/${prop}`;
                } else if (prop === 'mp3' || prop === 'm4a' || prop === 'wav') {
                    // Formatos de audio
                    path = `/convert/audio/to/${prop}`;
                } else if (prop === 'mp4' || prop === 'webm') {
                    // Formatos de video
                    path = `/convert/video/to/${prop}`;
                } else if (prop === 'jpg') {
                    // Formatos de imagen
                    path = `/convert/image/to/${prop}`;
                } else {
                    // Fallback para otros tipos
                    path = `/${prop}`;
                }
                
                // Registrar el endpoint formateado
                availableEndpoints.push({
                    path: path,
                    methods: ['POST'],
                    description: type.description || `Convert to ${prop} format`
                });
            }
        }
        
        // Añadir otros endpoints
        availableEndpoints.push({ path: '/', methods: ['GET'], description: 'API Documentation' });
        availableEndpoints.push({ path: '/endpoints', methods: ['GET'], description: 'List available endpoints' });
        
        return availableEndpoints;
    }
}

module.exports = FFmpegService;
