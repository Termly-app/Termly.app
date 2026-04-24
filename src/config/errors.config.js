export const ERROR_CONFIG = {
  NETWORK_OFFLINE: {
    code: 'NETWORK_OFFLINE',
    title: 'You are offline',
    message: 'Check your internet connection and try again.',
    severity: 'high'
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    title: 'Server Error',
    message: 'We are experiencing internal server issues. Our team has been notified.',
    severity: 'high'
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    severity: 'medium'
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    title: 'Session Expired',
    message: 'Please log in again to continue.',
    severity: 'high'
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    title: 'Access Denied',
    message: 'You do not have permission to view this resource.',
    severity: 'medium'
  },
  UNKNOWN: {
    code: 'UNKNOWN',
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    severity: 'medium'
  }
};

export function getErrorState(errorOrStatus) {
  if (errorOrStatus === 500 || errorOrStatus === 502 || errorOrStatus === 503 || errorOrStatus === 504) {
    return ERROR_CONFIG.SERVER_ERROR;
  }
  if (errorOrStatus === 401) return ERROR_CONFIG.UNAUTHORIZED;
  if (errorOrStatus === 403) return ERROR_CONFIG.FORBIDDEN;
  if (errorOrStatus === 404) return ERROR_CONFIG.NOT_FOUND;
  if (errorOrStatus === 'offline' || !navigator.onLine) return ERROR_CONFIG.NETWORK_OFFLINE;
  
  return ERROR_CONFIG.UNKNOWN;
}
