export type Lang = 'en' | 'es';

export const t = {
  en: {
    // Header
    langLabel:        'English → Latin American Spanish',
    // Page states
    dubbingComplete:  'Dubbing complete',
    videoReady:       'Your video is ready to download',
    dubAnother:       'Dub another video',
    tryAgain:         'Try again',
    poweredBy:        'Powered by Groq · ElevenLabs · Claude',
    feedback:         'Feedback',
    // UploadForm
    uploadFile:       'Upload file',
    youtubeUrl:       'YouTube URL',
    clickToSelect:    'Click to select video',
    fileTypes:        'MP4, MOV, AVI, MKV',
    voice:            'Voice',
    female:           'Female',
    male:             'Male',
    starting:         'Starting…',
    dubToSpanish:     'Dub to Spanish',
    noFile:           'No file selected',
    noUrl:            'No URL entered',
    // ProgressDisplay
    processing:       'Processing',
    connectionLost:   'Connection lost',
    steps: {
      download:       'Download',
      extract_audio:  'Extract Audio',
      transcribe:     'Transcribe',
      translate:      'Translate',
      tts:            'Voice',
      timing:         'Timing',
      mux:            'Assemble',
    },
    // DownloadButton
    downloadVideo:    'Download dubbed video',
    // FeedbackModal
    shareFeeback:     'Share feedback',
    helpImprove:      'Help us improve Video Dubber',
    suggestion:       'Suggestion',
    bugReport:        'Bug report',
    generalFeedback:  'General feedback',
    messageLabel:     'Message *',
    messagePlaceholder: 'Describe your suggestion or report...',
    nameLabel:        'Name',
    emailLabel:       'Email',
    optional:         'Optional',
    cancel:           'Cancel',
    sendFeedback:     'Send feedback',
    sending:          'Sending…',
    thankYou:         'Thank you!',
    feedbackSent:     'Your feedback has been sent.',
    done:             'Done',
  },
  es: {
    // Header
    langLabel:        'Inglés → Español Latinoamericano',
    // Page states
    dubbingComplete:  'Doblaje completado',
    videoReady:       'Tu video está listo para descargar',
    dubAnother:       'Doblar otro video',
    tryAgain:         'Intentar de nuevo',
    poweredBy:        'Desarrollado con Groq · ElevenLabs · Claude',
    feedback:         'Comentarios',
    // UploadForm
    uploadFile:       'Subir archivo',
    youtubeUrl:       'URL de YouTube',
    clickToSelect:    'Haz clic para seleccionar un video',
    fileTypes:        'MP4, MOV, AVI, MKV',
    voice:            'Voz',
    female:           'Femenina',
    male:             'Masculina',
    starting:         'Iniciando…',
    dubToSpanish:     'Doblar al español',
    noFile:           'No se seleccionó ningún archivo',
    noUrl:            'No se ingresó ninguna URL',
    // ProgressDisplay
    processing:       'Procesando',
    connectionLost:   'Conexión perdida',
    steps: {
      download:       'Descarga',
      extract_audio:  'Extraer Audio',
      transcribe:     'Transcribir',
      translate:      'Traducir',
      tts:            'Voz',
      timing:         'Sincronización',
      mux:            'Ensamblar',
    },
    // DownloadButton
    downloadVideo:    'Descargar video doblado',
    // FeedbackModal
    shareFeeback:     'Compartir comentario',
    helpImprove:      'Ayúdanos a mejorar Video Dubber',
    suggestion:       'Sugerencia',
    bugReport:        'Reporte de error',
    generalFeedback:  'Comentario general',
    messageLabel:     'Mensaje *',
    messagePlaceholder: 'Describe tu sugerencia o reporte...',
    nameLabel:        'Nombre',
    emailLabel:       'Correo',
    optional:         'Opcional',
    cancel:           'Cancelar',
    sendFeedback:     'Enviar comentario',
    sending:          'Enviando…',
    thankYou:         '¡Gracias!',
    feedbackSent:     'Tu comentario ha sido enviado.',
    done:             'Listo',
  },
} satisfies Record<Lang, object>;

export type Translations = typeof t.en;
