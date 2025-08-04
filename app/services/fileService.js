/**
 * Servicio de gestión de archivos
 * 
 * Este servicio se encarga de todas las operaciones relacionadas con 
 * la manipulación de archivos durante el proceso de conversión.
 */

const fs = require('fs');
const path = require('path');
const uniqueFilename = require('unique-filename');
const winston = require('winston');

class FileService {
    /**
     * Genera un nombre de archivo único en el directorio de subidas
     * 
     * @param {string} baseDir - Directorio base
     * @returns {string} - Ruta completa al nuevo archivo
     */
    static generateUniqueFilename(baseDir) {
        return uniqueFilename(baseDir);
    }

    /**
     * Crea un stream de escritura para guardar un archivo
     * 
     * @param {string} filePath - Ruta donde guardar el archivo
     * @returns {fs.WriteStream} - Stream de escritura
     */
    static createWriteStream(filePath) {
        return fs.createWriteStream(filePath);
    }

    /**
     * Elimina un archivo si existe
     * 
     * @param {string} filePath - Ruta al archivo a eliminar
     * @returns {boolean} - True si se eliminó, false si no
     */
    static deleteFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                winston.info(JSON.stringify({
                    action: 'deleted',
                    file: filePath
                }));
                return true;
            }
            return false;
        } catch (error) {
            winston.error(JSON.stringify({
                type: 'delete_error',
                message: error.toString(),
                file: filePath
            }));
            return false;
        }
    }

    /**
     * Verifica si un archivo existe y devuelve sus estadísticas
     * 
     * @param {string} filePath - Ruta al archivo
     * @returns {Promise<Object>} - Promesa con las estadísticas del archivo
     */
    static getFileStats(filePath) {
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stats);
                }
            });
        });
    }

    /**
     * Crea un directorio recursivamente si no existe
     * 
     * @param {string} dirPath - Ruta al directorio
     * @returns {Promise<boolean>} - Promesa que se resuelve cuando el directorio existe
     */
    static ensureDirectoryExists(dirPath) {
        return new Promise((resolve, reject) => {
            fs.mkdir(dirPath, { recursive: true }, (err) => {
                if (err && err.code !== 'EEXIST') {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        });
    }

    /**
     * Devuelve el tamaño legible de un archivo
     * 
     * @param {number} bytes - Tamaño en bytes
     * @returns {string} - Tamaño formateado (KB, MB, GB)
     */
    static getReadableFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
        else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
        else return (bytes / 1073741824).toFixed(2) + ' GB';
    }
}

module.exports = FileService;
