export const VOICES = [
  { id: 'cIBxLwfshLYhRB9lCXEg', name: 'Carolina',    gender: 'female', lang: 'es'   },
  { id: 'jUxkp8eMgszgJX3XU2pV', name: 'Annie',        gender: 'female', lang: 'es'   },
  { id: '22VndfJPBU7AZORAZZTT', name: 'Salvatore',    gender: 'male',   lang: 'es'   },
  { id: 'YExhVa4bZONzeingloMX', name: 'Juan Carlos',  gender: 'male',   lang: 'es'   },
  { id: 'lMifbV29t7Wz2VrjgNs6', name: 'Lisandro',     gender: 'male',   lang: 'es'   },
  { id: 'HbJt0yomFFBFMBQ7I69w', name: 'Agustin',      gender: 'male',   lang: 'es'   },
  { id: 'zz96trXRmkXXgTVEtLgy', name: 'Victor',       gender: 'male',   lang: 'es'   },
  { id: 'cyD08lEy76q03ER1jZ7y', name: 'Scheila',      gender: 'female', lang: 'pt-BR' },
  { id: 'NQ10OlqJ7vYH6XwegHSW', name: 'Lucke',        gender: 'male',   lang: 'pt-BR' },
  { id: 'aU2vcrnwi348Gnc2Y1si', name: 'Jose',         gender: 'male',   lang: 'pt-BR' },
  { id: 'wOCZZnsBoGOFlQRdxeRb', name: 'Peter',        gender: 'male',   lang: 'pt-BR' },
  { id: 'oJebhZNaPllxk6W0LSBA', name: 'Carla',        gender: 'female', lang: 'pt-BR' },
  { id: 'rthJ5Dw4ng8Orz8mYafh', name: 'Luana',        gender: 'female', lang: 'pt-BR' },
  { id: 'S4M4JhZIzYGUlDsYIOow', name: 'Elena',        gender: 'female', lang: 'pt-BR' },
] as const;

export const DEFAULT_VOICE_ID = VOICES[0].id;

export type TargetLang = 'es' | 'pt-BR';

export function getVoicesByLang(lang: TargetLang) {
  return VOICES.filter(v => v.lang === lang);
}
