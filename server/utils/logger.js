const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const resolveLevel = () => {
  const envLevel = (process.env.LOG_LEVEL || '').toLowerCase();
  if (envLevel && LEVELS[envLevel] != null) return envLevel;
  return process.env.NODE_ENV === 'production' ? 'warn' : 'info';
};

const currentLevel = LEVELS[resolveLevel()] ?? LEVELS.info;

const shouldLog = (level) => (LEVELS[level] ?? 100) >= currentLevel;

const safeJson = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
};

const formatMeta = (meta) => {
  if (meta == null) return '';
  if (typeof meta === 'string') return meta;
  return safeJson(meta);
};

export const logger = {
  debug(message, meta) {
    if (!shouldLog('debug')) return;
    console.debug(`[debug] ${message}`, meta ?? '');
  },
  info(message, meta) {
    if (!shouldLog('info')) return;
    console.info(`[info] ${message}`, meta ?? '');
  },
  warn(message, meta) {
    if (!shouldLog('warn')) return;
    console.warn(`[warn] ${message}`, meta ?? '');
  },
  error(message, meta) {
    if (!shouldLog('error')) return;
    console.error(`[error] ${message}`, meta ?? '');
  },
  child(baseMeta) {
    return {
      debug: (message, meta) => logger.debug(message, { ...baseMeta, ...(meta ?? {}) }),
      info: (message, meta) => logger.info(message, { ...baseMeta, ...(meta ?? {}) }),
      warn: (message, meta) => logger.warn(message, { ...baseMeta, ...(meta ?? {}) }),
      error: (message, meta) => logger.error(message, { ...baseMeta, ...(meta ?? {}) }),
      child: (moreMeta) => logger.child({ ...baseMeta, ...(moreMeta ?? {}) }),
    };
  },
  formatMeta,
};
