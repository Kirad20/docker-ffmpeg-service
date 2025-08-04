exports.types = {
    jpg: {
        extension: 'jpg',
        description: 'Convert image to JPG format',
        outputOptions: [
            '-pix_fmt yuv422p',
            '-q:v 2',  // Mejor calidad de imagen (1-31, donde 1 es la mejor)
        ],
    },
    m4a: {
        extension: 'm4a',
        description: 'Convert audio to M4A format (AAC)',
        outputOptions: [
            '-codec:a aac',  // Usando AAC nativo en lugar de libfdk_aac
            '-b:a 192k',     // Mayor bitrate para mejor calidad
            '-ar 48000',     // Frecuencia de muestreo de 48kHz
        ],
    },
    mp3: {
        extension: 'mp3',
        description: 'Convert audio to MP3 format',
        outputOptions: [
            '-codec:a libmp3lame',
            '-q:a 2',        // Calidad VBR (0-9, donde 0 es la mejor)
            '-ar 44100',     // Frecuencia de muestreo estándar CD
            '-id3v2_version 3',  // Versión de metadatos compatible
        ],
    },
    wav: {
        extension: 'wav',
        description: 'Convert audio to WAV format',
        outputOptions: [
            '-acodec pcm_s16le',  // PCM 16-bit estándar
            '-ar 44100',          // Frecuencia de muestreo estándar CD
        ],
    },
    mp4: {
        extension: 'mp4',
        description: 'Convert video to MP4 format (H.264)',
        outputOptions: [
            '-codec:v libx264',
            '-profile:v high',
            '-tune film',     // Optimizado para contenido general
            '-r 24',          // Framerate estándar de cine
            '-crf 23',        // Balance calidad/tamaño
            '-preset medium', // Balance entre velocidad/compresión
            '-b:v 0',         // Usando sólo CRF para control de calidad
            '-vf scale=-2:720', // HD
            '-threads 0',     // Uso automático de hilos
            '-codec:a aac',   // Codec de audio nativo
            '-b:a 192k',      // Mayor bitrate para mejor calidad
            '-movflags +faststart',  // Optimiza para streaming
        ],
    },
    webm: {
        extension: 'webm',
        description: 'Convert video to WebM format (VP9)',
        outputOptions: [
            '-codec:v libvpx',         // VP8 es más rápido y compatible que VP9
            '-quality good',           // Balance calidad/velocidad
            '-cpu-used 4',             // Balance rendimiento/calidad (0-16, donde 16 es más rápido)
            '-b:v 1000k',              // Bitrate de video objetivo
            '-qmin 10',                // Calidad mínima
            '-qmax 42',                // Calidad máxima
            '-maxrate 1500k',          // Bitrate máximo
            '-bufsize 2000k',          // Tamaño del buffer
            '-vf scale=-2:720',        // HD
            '-deadline good',          // Balance velocidad/calidad
            '-threads 0',              // Usar todos los hilos disponibles
            '-codec:a libvorbis',      // Codec de audio (más rápido que opus)
            '-b:a 128k',               // Bitrate audio
            '-ar 44100',               // Frecuencia de muestreo estándar
            '-ac 2',                   // 2 canales de audio
            '-max_muxing_queue_size 9999', // Prevenir errores de cola de multiplexación
        ],
    },
    'compress-mp4': {
        extension: 'mp4',
        description: 'Compress video to MP4 format with ~60% size reduction',
        outputOptions: [
            '-codec:v libx264',
            '-profile:v high',
            '-preset slower',      // Mejor compresión
            '-crf 28',             // Mayor valor = más compresión
            '-tune film',          // Optimizado para contenido general
            '-r 24',               // Framerate estándar
            '-vf scale=-2:480',    // Resolución reducida (SD)
            '-movflags +faststart',// Optimiza para streaming
            '-codec:a aac',
            '-b:a 96k',            // Bitrate audio reducido
            '-ac 2',               // Asegura 2 canales de audio
            '-threads 0',          // Uso automático de hilos
            '-metadata title="Compressed with FFmpeg 6.0"',
        ],
    },
    'compress-webm': {
        extension: 'webm',
        description: 'Compress video to WebM format with ~60% size reduction',
        outputOptions: [
            '-codec:v libvpx',         // VP8 es más rápido y compatible que VP9
            '-quality realtime',       // Priorizar velocidad sobre calidad
            '-cpu-used 16',            // Máxima velocidad (0-16, mayor es más rápido)
            '-b:v 400k',               // Bitrate de video objetivo bajo para mejor compresión
            '-minrate 200k',           // Bitrate mínimo
            '-maxrate 600k',           // Bitrate máximo
            '-bufsize 800k',           // Tamaño del buffer
            '-vf scale=-2:360',        // Resolución reducida para mejor compresión
            '-deadline realtime',      // Máxima velocidad
            '-auto-alt-ref 0',         // Desactivar referencia alternativa para mayor velocidad
            '-lag-in-frames 0',        // Desactivar lag para mayor velocidad
            '-error-resilient 1',      // Resiliencia a errores
            '-threads 0',              // Usar todos los hilos disponibles
            '-codec:a libvorbis',      // Codec de audio más rápido que opus
            '-b:a 64k',                // Bitrate audio reducido
            '-ar 22050',               // Frecuencia de muestreo reducida para mejor compresión
            '-ac 1',                   // Mono para mejor compresión
            '-max_muxing_queue_size 9999', // Evitar errores de cola
            '-slices 4',               // División para paralelización
            '-row-mt 1',               // Multihilo por fila
        ],
    },
    'hevc': {
        extension: 'mp4',
        description: 'Convert video to HEVC (H.265) for better compression (70-80% reduction)',
        outputOptions: [
            '-codec:v libx265',   // Codec HEVC (H.265)
            '-crf 28',            // Balance calidad/tamaño
            '-preset medium',     // Balance velocidad/compresión
            '-tag:v hvc1',        // Tag compatible con reproductores Apple
            '-vf scale=-2:720',   // HD
            '-x265-params',
            'bframes=8:psy-rd=1:aq-mode=3',  // Parámetros avanzados x265
            '-codec:a aac',
            '-b:a 128k',
            '-movflags +faststart',  // Optimiza para streaming
        ],
    },
    'av1': {
        extension: 'mp4',
        description: 'Convert video to AV1 format for highest compression (up to 85% reduction)',
        outputOptions: [
            '-codec:v libaom-av1',  // Codec AV1
            '-crf 30',              // Balance calidad/tamaño
            '-b:v 0',               // Usar solo CRF
            '-strict experimental',
            '-cpu-used 4',          // 0-8, menor es mejor calidad
            '-vf scale=-2:720',     // HD
            '-tiles 2x2',           // División para paralelización
            '-row-mt 1',            // Multihilo por fila
            '-codec:a libopus',
            '-b:a 128k',
        ],
    }
};
