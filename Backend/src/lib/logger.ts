export const logger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    let errDetail = '';
    if (error instanceof Error) {
      errDetail = `${error.message}\nStack: ${error.stack}`;
    } else if (error) {
      errDetail = JSON.stringify(error);
    }
    console.error(`[${timestamp}] [ERROR] ${message} ${errDetail}`);
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
};
