exports.types = {
    jpg: {
        extension: 'jpg',
        outputOptions: [
            '-pix_fmt yuv422p',
        ],
    },
    m4a: {
        extension: 'm4a',
        outputOptions: [
            '-codec:a libfdk_aac',
        ],
    },
    mp3: {
        extension: 'mp3',
        outputOptions: [
            '-codec:a libmp3lame',
        ],
    },
    mp4: {
        extension: 'mp4',
        outputOptions: [
            '-codec:v libx264',
            '-profile:v high',
            '-r 15',
            '-crf 23',
            '-preset ultrafast',
            '-b:v 500k',
            '-maxrate 500k',
            '-bufsize 1000k',
            '-vf scale=-2:640',
            '-threads 8',
            '-codec:a libfdk_aac',
            '-b:a 128k',
        ],
    },
    'compress-mp4': {
        extension: 'mp4',
        outputOptions: [
            '-codec:v libx264',
            '-profile:v high',
            '-preset slow', // Mejor compresión pero más lento
            '-crf 28', // Mayor valor = más compresión
            '-r 24', // Reducimos un poco los frames por segundo
            '-vf scale=-2:480', // Resolución reducida (SD)
            '-movflags +faststart', // Optimiza para streaming
            '-codec:a aac',
            '-b:a 96k', // Bitrate audio reducido
            '-ac 2', // Asegura 2 canales de audio
            '-threads 0', // Uso automático de hilos
        ],
    },
    'compress-webm': {
        extension: 'webm',
        outputOptions: [
            '-codec:v libvpx-vp9',
            '-b:v 500k', // Bitrate de video bajo
            '-maxrate 750k',
            '-crf 33', // Mayor valor = más compresión
            '-r 24', // Reducimos un poco los frames por segundo
            '-vf scale=-2:480', // Resolución reducida (SD)
            '-deadline good', // Balance entre velocidad/calidad
            '-cpu-used 2', // Multihilo
            '-codec:a libopus',
            '-b:a 96k', // Bitrate audio reducido
            '-ac 2', // Asegura 2 canales de audio
        ],
    },
};
