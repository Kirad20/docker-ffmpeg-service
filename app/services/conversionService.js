/**
 * Servicio de Conversión FFmpeg
 * 
 * Este servicio encapsula todas las operaciones relacionadas con la conversión
 * de archivos usando FFmpeg, proporcionando una interfaz limpia y robusta.
 */

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');
const winston = require('winston');
const consts = require('../constants');

class ConversionService {
    /**
     * Convierte un archivo usando FFmpeg con manejo avanzado de errores
     * y métodos alternativos en caso de fallo.
     * 
     * @param {Object} options - Opciones de conversión
     * @param {string} options.inputFile - Ruta al archivo de entrada
     * @param {string} options.outputFile - Ruta al archivo de salida
     * @param {string} options.fileName - Nombre original del archivo
     * @param {Array} options.outputOptions - Opciones de FFmpeg
     * @param {string} options.extension - Extensión del archivo de salida
     * @param {Function} options.onSuccess - Callback en caso de éxito
     * @param {Function} options.onError - Callback en caso de error
     * @param {Function} options.onProgress - Callback para reportar progreso
     * @returns {Promise} - Promise que se resuelve cuando la conversión termina
     */
    static convertFile(options) {
        const {
            inputFile,
            outputFile,
            fileName,
            outputOptions,
            extension,
            onSuccess,
            onError,
            onProgress
        } = options;

        return new Promise((resolve, reject) => {
            // Verificar que el archivo existe y obtener estadísticas
            this.verifyInputFile(inputFile)
                .then(fileStats => {
                    winston.info(JSON.stringify({
                        action: 'file_check',
                        path: inputFile,
                        exists: true,
                        size: fileStats.size,
                        permissions: fileStats.mode.toString(8)
                    }));

                    // Comprobar la versión de FFmpeg
                    this.checkFFmpegVersion();

                    // Configurar timeout para la operación
                    const timeoutId = setTimeout(() => {
                        const timeoutError = new Error(`Conversion timeout after ${consts.ffmpegTimeout / 1000} seconds`);
                        this.handleError(timeoutError, inputFile, 504, onError);
                        reject(timeoutError);
                    }, consts.ffmpegTimeout || 600000);

                    // Flag para método alternativo
                    let usingAlternateMethod = false;

                    // Intentar conversión con método principal
                    try {
                        this.convertWithFluentFFmpeg({
                            inputFile,
                            outputFile,
                            outputOptions,
                            timeoutId,
                            onSuccess,
                            onError,
                            onProgress,
                            usingAlternateMethod,
                            fileName,
                            extension,
                            resolve,
                            reject,
                            tryAlternateMethod: () => {
                                usingAlternateMethod = true;
                                this.convertWithDirectFFmpeg({
                                    inputFile,
                                    outputFile,
                                    outputOptions,
                                    timeoutId,
                                    onSuccess,
                                    onError,
                                    fileName,
                                    extension,
                                    resolve,
                                    reject
                                });
                            }
                        });
                    } catch (error) {
                        winston.error(JSON.stringify({
                            type: 'ffmpeg_init_error',
                            error: error.toString()
                        }));

                        // Si falla el método principal, intentar el alternativo
                        if (!usingAlternateMethod) {
                            usingAlternateMethod = true;
                            this.convertWithDirectFFmpeg({
                                inputFile,
                                outputFile,
                                outputOptions,
                                timeoutId,
                                onSuccess,
                                onError,
                                fileName,
                                extension,
                                resolve,
                                reject
                            });
                        }
                    }
                })
                .catch(error => {
                    this.handleError(error, inputFile, 500, onError);
                    reject(error);
                });
        });
    }

    /**
     * Verifica que el archivo de entrada existe y obtiene sus estadísticas
     * 
     * @param {string} inputFile - Ruta al archivo de entrada
     * @returns {Promise} - Promise que se resuelve con las estadísticas del archivo
     */
    static verifyInputFile(inputFile) {
        winston.info(JSON.stringify({
            action: 'verifying_input_file',
            path: inputFile
        }));
        
        return new Promise((resolve, reject) => {
            fs.stat(inputFile, (err, stats) => {
                if (err) {
                    winston.error(JSON.stringify({
                        action: 'file_check',
                        path: inputFile,
                        error: err.toString(),
                        error_code: err.code,
                        exists: false
                    }));
                    reject(new Error(`Could not access the uploaded file: ${err.message}`));
                } else {
                    // Intentar leer un fragmento del archivo para verificar permisos
                    try {
                        const fd = fs.openSync(inputFile, 'r');
                        const buffer = Buffer.alloc(1024);
                        const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
                        fs.closeSync(fd);
                        
                        winston.info(JSON.stringify({
                            action: 'file_check_read_test',
                            path: inputFile,
                            bytesRead: bytesRead,
                            successful: true
                        }));
                        
                        resolve(stats);
                    } catch (readError) {
                        winston.error(JSON.stringify({
                            action: 'file_check_read_test',
                            path: inputFile,
                            error: readError.toString(),
                            error_code: readError.code,
                            successful: false
                        }));
                        reject(new Error(`File exists but cannot be read: ${readError.message}`));
                    }
                }
            });
        });
    }

    /**
     * Comprueba la versión de FFmpeg instalada
     */
    static checkFFmpegVersion() {
        try {
            const ffmpegVersion = require('child_process').execSync('ffmpeg -version').toString().split('\n')[0];
            winston.info(JSON.stringify({
                action: 'ffmpeg_version',
                version: ffmpegVersion
            }));

            // Configurar las rutas de ffmpeg y ffprobe si están definidas como variables de entorno
            if (process.env.FFMPEG_PATH) {
                require('fluent-ffmpeg').setFfmpegPath(process.env.FFMPEG_PATH);
                winston.info(JSON.stringify({
                    action: 'ffmpeg_path_set',
                    path: process.env.FFMPEG_PATH
                }));
            }

            if (process.env.FFPROBE_PATH) {
                require('fluent-ffmpeg').setFfprobePath(process.env.FFPROBE_PATH);
                winston.info(JSON.stringify({
                    action: 'ffprobe_path_set',
                    path: process.env.FFPROBE_PATH
                }));
            }

            return true;
        } catch (error) {
            winston.error(JSON.stringify({
                action: 'ffmpeg_version',
                error: error.toString()
            }));
            return false;
        }
    }

    /**
     * Convierte un archivo usando la biblioteca fluent-ffmpeg
     * 
     * @param {Object} options - Opciones para la conversión
     */
    static convertWithFluentFFmpeg(options) {
        const {
            inputFile,
            outputFile,
            outputOptions,
            timeoutId,
            onSuccess,
            onError,
            onProgress,
            usingAlternateMethod,
            fileName,
            extension,
            resolve,
            reject,
            tryAlternateMethod
        } = options;

        winston.info(JSON.stringify({
            action: 'ffmpeg_conversion_start',
            method: 'fluent-ffmpeg',
            inputFile: inputFile,
            outputFile: outputFile,
            outputFormat: extension
        }));

        try {
            // Verificar que ffmpeg está disponible
            if (!this.checkFFmpegVersion()) {
                throw new Error('FFmpeg no está instalado o no es accesible');
            }

            // Crear una nueva instancia de ffmpeg
            const ffmpegCommand = ffmpeg(inputFile);

            // Loggear las opciones que se utilizarán
            winston.info(JSON.stringify({
                action: 'ffmpeg_options',
                options: outputOptions
            }));

            // Configurar listener de progreso
            ffmpegCommand.on('progress', progress => {
                winston.info(JSON.stringify({
                    action: 'ffmpeg_progress',
                    frames: progress.frames,
                    fps: progress.currentFps,
                    percent: progress.percent,
                    timemark: progress.timemark
                }));

                if (typeof onProgress === 'function') {
                    onProgress(progress);
                }
            });

            // Configurar opciones específicas para asegurar la compatibilidad
            ffmpegCommand
                .renice(15)
                .outputOptions(outputOptions)
                .on('start', commandLine => {
                    winston.info(JSON.stringify({
                        action: 'ffmpeg_start',
                        command: commandLine
                    }));
                })
                .on('stderr', stderrLine => {
                    winston.info(JSON.stringify({
                        action: 'ffmpeg_stderr',
                        output: stderrLine
                    }));
                })
                .on('error', (err, stdout, stderr) => {
                    // Si ya estamos usando el método alternativo, no hacer nada
                    if (usingAlternateMethod) return;

                    winston.error(JSON.stringify({
                        type: 'ffmpeg_error',
                        message: err.toString(),
                        stdout: stdout ? stdout.substring(0, 500) : 'No stdout',
                        stderr: stderr ? stderr.substring(0, 500) : 'No stderr'
                    }));

                    // Intentar el método alternativo
                    winston.info(JSON.stringify({
                        action: 'trying_alternate_method',
                        reason: err.toString().substring(0, 200)
                    }));
                    
                    tryAlternateMethod();
                })
                .on('end', (stdout, stderr) => {
                    // Si ya estamos usando el método alternativo, no hacer nada
                    if (usingAlternateMethod) return;

                    // Cancelar el timeout
                    clearTimeout(timeoutId);

                    winston.info(JSON.stringify({
                        action: 'ffmpeg_complete',
                        stdout: stdout ? stdout.substring(0, 500) : 'No stdout',
                        stderr: stderr ? stderr.substring(0, 500) : 'No stderr'
                    }));

                    // Limpiar archivo de entrada
                    this.cleanupFile(inputFile);

                    // Verificar archivo de salida
                    try {
                        if (!fs.existsSync(outputFile)) {
                            const outputError = new Error('Output file was not created');
                            winston.error(JSON.stringify({
                                action: 'output_file_check',
                                exists: false,
                                path: outputFile,
                                error: outputError.toString()
                            }));
                            this.handleError(outputError, inputFile, 500, onError);
                            reject(outputError);
                            return;
                        }
                        
                        const outputStats = fs.statSync(outputFile);
                        winston.info(JSON.stringify({
                            action: 'output_file_check',
                            exists: true,
                            size: outputStats.size,
                            path: outputFile
                        }));
                        
                        if (outputStats.size === 0) {
                            const emptyOutputError = new Error('Output file is empty');
                            winston.error(JSON.stringify({
                                action: 'output_file_check',
                                exists: true,
                                size: 0,
                                path: outputFile,
                                error: emptyOutputError.toString()
                            }));
                            this.handleError(emptyOutputError, inputFile, 500, onError);
                            reject(emptyOutputError);
                            return;
                        }
                    } catch (error) {
                        winston.error(JSON.stringify({
                            action: 'output_file_check',
                            error: error.toString(),
                            path: outputFile
                        }));
                        this.handleError(error, inputFile, 500, onError);
                        reject(error);
                        return;
                    }

                    // Éxito!
                    winston.info(JSON.stringify({
                        action: 'conversion_successful',
                        outputFile: outputFile,
                        fileName: fileName,
                        extension: extension
                    }));
                    
                    if (typeof onSuccess === 'function') {
                        onSuccess(outputFile, fileName, extension);
                    }
                    resolve(outputFile);
                })
                // Utilizar el método save() para iniciar la conversión
                .save(outputFile);
        } catch (error) {
            winston.error(JSON.stringify({
                action: 'ffmpeg_init_error',
                error: error.toString(),
                stack: error.stack
            }));
            
            // Si hay un error al inicializar FFmpeg, intentamos el método alternativo
            if (!usingAlternateMethod) {
                winston.info(JSON.stringify({
                    action: 'trying_alternate_method_after_init_error',
                    reason: error.toString().substring(0, 200)
                }));
                
                tryAlternateMethod();
            } else {
                // Si ya estábamos usando el método alternativo, reportamos el error
                this.handleError(error, inputFile, 500, onError);
                reject(error);
            }
        }
    }

    /**
     * Convierte un archivo usando directamente el comando FFmpeg
     * 
     * @param {Object} options - Opciones para la conversión
     */
    static convertWithDirectFFmpeg(options) {
        const {
            inputFile,
            outputFile,
            outputOptions,
            timeoutId,
            onSuccess,
            onError,
            fileName,
            extension,
            resolve,
            reject
        } = options;

        winston.info(JSON.stringify({
            action: 'using_alternate_method',
            message: 'Trying direct FFmpeg command'
        }));

        // Construir los argumentos para FFmpeg
        const args = ['-i', inputFile];

        // Añadir opciones de salida
        outputOptions.forEach(option => {
            const parts = option.split(' ');
            parts.forEach(part => {
                if (part.trim()) {
                    args.push(part.trim());
                }
            });
        });

        // Añadir archivo de salida
        args.push(outputFile);

        winston.info(JSON.stringify({
            action: 'ffmpeg_spawn',
            command: 'ffmpeg ' + args.join(' ')
        }));

        // Spawn del proceso FFmpeg
        const ffmpegProcess = spawn('ffmpeg', args);

        let stdoutData = '';
        let stderrData = '';

        ffmpegProcess.stdout.on('data', data => {
            stdoutData += data.toString();
            winston.info(JSON.stringify({
                action: 'ffmpeg_stdout',
                data: data.toString().substring(0, 200)
            }));
        });

        ffmpegProcess.stderr.on('data', data => {
            stderrData += data.toString();
            winston.info(JSON.stringify({
                action: 'ffmpeg_stderr',
                data: data.toString().substring(0, 200)
            }));
        });

        ffmpegProcess.on('close', code => {
            // Cancelar el timeout
            clearTimeout(timeoutId);

            winston.info(JSON.stringify({
                action: 'ffmpeg_process_close',
                code: code
            }));

            if (code === 0) {
                // Éxito
                this.cleanupFile(inputFile);

                // Verificar archivo de salida
                if (!fs.existsSync(outputFile)) {
                    const outputError = new Error('Output file was not created');
                    this.handleError(outputError, inputFile, 500, onError);
                    reject(outputError);
                    return;
                }

                // Llamar callback de éxito
                if (typeof onSuccess === 'function') {
                    onSuccess(outputFile, fileName, extension);
                }
                resolve(outputFile);
            } else {
                // Error
                const spawnError = new Error(`FFmpeg exited with code ${code}`);
                winston.error(JSON.stringify({
                    type: 'ffmpeg_alternate',
                    code: code,
                    stdout: stdoutData,
                    stderr: stderrData
                }));

                this.handleError(spawnError, inputFile, 500, onError);
                reject(spawnError);
            }
        });

        ffmpegProcess.on('error', err => {
            winston.error(JSON.stringify({
                type: 'ffmpeg_spawn_error',
                error: err.toString()
            }));

            this.handleError(err, inputFile, 500, onError);
            reject(err);
        });
    }

    /**
     * Maneja un error de conversión
     * 
     * @param {Error} error - Error que ocurrió
     * @param {string} inputFile - Archivo de entrada a limpiar
     * @param {number} statusCode - Código de estado HTTP
     * @param {Function} onError - Callback de error
     */
    static handleError(error, inputFile, statusCode, onError) {
        winston.error(JSON.stringify({
            type: 'conversion_error',
            message: error.toString()
        }));

        this.cleanupFile(inputFile);

        if (typeof onError === 'function') {
            onError(error, statusCode);
        }
    }

    /**
     * Limpia un archivo si existe
     * 
     * @param {string} filePath - Ruta al archivo a limpiar
     */
    static cleanupFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                winston.info(JSON.stringify({
                    action: 'cleanup',
                    path: filePath,
                    result: 'success'
                }));
            }
        } catch (e) {
            winston.error(JSON.stringify({
                type: 'cleanup',
                path: filePath,
                message: e.toString()
            }));
        }
    }
}

module.exports = ConversionService;
