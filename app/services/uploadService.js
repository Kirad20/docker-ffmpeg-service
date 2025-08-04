/**
 * Servicio de subida de archivos
 * 
 * Este servicio gestiona el proceso de subida de archivos usando Busboy,
 * con manejo de errores y límites.
 */

const Busboy = require('busboy');
const winston = require('winston');
const FileService = require('./fileService');

class UploadService {
    /**
     * Procesa una subida de archivo
     * 
     * @param {Object} req - Objeto request de Express
     * @param {Object} options - Opciones de configuración
     * @param {number} options.fileSizeLimit - Tamaño máximo de archivo
     * @param {string} options.uploadDir - Directorio de subida
     * @param {Function} options.onFileComplete - Callback cuando se completa la subida
     * @param {Function} options.onError - Callback para manejo de errores
     * @returns {Promise} - Promesa que se resuelve con la información del archivo
     */
    static processUpload(req, options) {
        const { fileSizeLimit, uploadDir, onFileComplete, onError } = options;

        return new Promise((resolve, reject) => {
            let hitLimit = false;
            let fileName = '';
            let bytes = 0;
            let savedFile = FileService.generateUniqueFilename(uploadDir);
            let fileInfo = {};
            
            const busboy = new Busboy({
                headers: req.headers,
                limits: {
                    files: 1,
                    fileSize: fileSizeLimit
                }
            });

            busboy.on('filesLimit', () => {
                const err = new Error('Too many files uploaded');
                winston.error(JSON.stringify({
                    type: 'filesLimit',
                    message: err.message
                }));
                
                if (typeof onError === 'function') {
                    onError(err, 400);
                }
                reject(err);
            });

            busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
                fileInfo = { filename, encoding, mimetype };
                
                file.on('limit', () => {
                    hitLimit = true;
                    const err = new Error(`File ${filename} exceeds max size limit of ${FileService.getReadableFileSize(fileSizeLimit)}`);
                    
                    winston.error(JSON.stringify({
                        type: 'fileLimit',
                        file: filename,
                        error: err.message
                    }));
                    
                    // Asegurarse de consumir el stream para que el evento 'finish' se dispare
                    file.resume();
                    
                    if (typeof onError === 'function') {
                        onError(err, 413); // 413 Payload Too Large
                    }
                    reject(err);
                });

                winston.info(JSON.stringify({
                    file: filename,
                    encoding: encoding,
                    mimetype: mimetype
                }));

                file.on('data', (data) => {
                    bytes += data.length;
                });

                file.on('end', () => {
                    fileInfo.bytes = bytes;
                    winston.info(JSON.stringify({
                        action: 'file_data_end',
                        ...fileInfo
                    }));
                });

                fileName = filename;
                winston.info(JSON.stringify({
                    action: 'Uploading',
                    name: fileName
                }));

                const writeStream = FileService.createWriteStream(savedFile);
                file.pipe(writeStream);

                writeStream.on('finish', () => {
                    winston.info(JSON.stringify({
                        action: 'writeStream_finish',
                        path: savedFile,
                        size: bytes
                    }));
                });

                writeStream.on('error', (err) => {
                    winston.error(JSON.stringify({
                        type: 'write_error',
                        message: err.toString()
                    }));
                    
                    // Asegurarse de consumir el stream para que el evento 'finish' se dispare
                    file.resume();
                    
                    if (typeof onError === 'function') {
                        onError(err, 500);
                    }
                    reject(err);
                });
            });

            busboy.on('finish', () => {
                if (hitLimit) {
                    FileService.deleteFile(savedFile);
                    return;
                }

                winston.info(JSON.stringify({
                    action: 'upload complete',
                    name: fileName,
                    bytes: bytes,
                    savedPath: savedFile
                }));

                // Verificar que el archivo existe y tiene contenido
                try {
                    const stats = fs.statSync(savedFile);
                    winston.info(JSON.stringify({
                        action: 'file_verification',
                        exists: true,
                        size: stats.size,
                        path: savedFile
                    }));
                    
                    if (stats.size === 0) {
                        const emptyFileError = new Error('Uploaded file is empty');
                        winston.error(JSON.stringify({
                            type: 'empty_file_error',
                            message: emptyFileError.message,
                            path: savedFile
                        }));
                        
                        if (typeof onError === 'function') {
                            onError(emptyFileError, 400);
                        }
                        reject(emptyFileError);
                        return;
                    }
                } catch (error) {
                    winston.error(JSON.stringify({
                        type: 'file_verification_error',
                        message: error.toString(),
                        path: savedFile
                    }));
                    
                    if (typeof onError === 'function') {
                        onError(error, 500);
                    }
                    reject(error);
                    return;
                }

                const uploadResult = {
                    originalName: fileName,
                    savedPath: savedFile,
                    size: bytes,
                    mimetype: fileInfo.mimetype
                };

                if (typeof onFileComplete === 'function') {
                    onFileComplete(uploadResult);
                }
                
                resolve(uploadResult);
            });

            busboy.on('error', (err) => {
                winston.error(JSON.stringify({
                    type: 'busboy_error',
                    message: err.toString()
                }));
                
                if (typeof onError === 'function') {
                    onError(err, 500);
                }
                reject(err);
            });

            req.pipe(busboy);
        });
    }
}

module.exports = UploadService;
