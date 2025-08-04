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
            '-codec:v libvpx-vp9',
            '-crf 30',         // Balance calidad/tamaño
            '-b:v 0',          // Usar solo CRF
            '-deadline good',  // Balance velocidad/calidad
            '-cpu-used 2',     // Multihilo
            '-vf scale=-2:720', // HD
            '-codec:a libopus',
            '-b:a 128k',
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
            '-codec:v libvpx-vp9',
            '-b:v 0',             // No limitar bitrate, usar CRF
            '-crf 35',            // Mayor valor = más compresión
            '-deadline good',     // Balance entre velocidad/calidad
            '-cpu-used 2',        // Multihilo
            '-tile-columns 2',    // Paralelización para decodificación
            '-frame-parallel 1',  // Codificación en paralelo
            '-auto-alt-ref 1',    // Mejora la compresión
            '-lag-in-frames 25',  // Mejora calidad a costa de latencia
            '-r 24',              // Framerate estándar
            '-vf scale=-2:480',   // Resolución reducida (SD)
            '-codec:a libopus',
            '-b:a 96k',           // Bitrate audio reducido
            '-ac 2',              // Asegura 2 canales de audio
            '-mapping_family 1',  // Optimiza contenedor WebM
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
