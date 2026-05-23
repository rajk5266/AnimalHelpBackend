class ApiError extends Error {
    statusCode: number;
    status: 'fail' | 'error';
    isOperational: boolean;
    code?: string | number;
    errors?: any[];

    constructor(statusCode: number, message: string, isOperational = true, code?: string, errors?: any[]) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;
        this.code = code;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default ApiError;
