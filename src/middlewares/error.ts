import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/apiError.js';
import { ZodError } from 'zod';

const handleCastErrorDB = (err: any) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new ApiError(400, message);
};

const handleDuplicateFieldsDB = (err: any) => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new ApiError(400, message);
};

const handleValidationErrorDB = (err: any) => {
    const errors = Object.values(err.errors).map((el: any) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new ApiError(400, message);
};

const handleZodError = (err: any) => {
    const message = err.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return new ApiError(400, message);
}

const handleJWTError = () => new ApiError(401, 'Invalid token. Please log in again!');

const handleJWTExpiredError = () => new ApiError(401, 'Your token has expired! Please log in again.');

const sendErrorDev = (err: ApiError, res: Response) => {
    res.status(err.statusCode).json({
        status: err.status || 'error',
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

const sendErrorProd = (err: ApiError, res: Response) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status || 'error',
            message: err.message,
        });
    } else {
        console.error('ERROR 💥', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });
    }
};

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // ensure all default properties
    err.statusCode = err.statusCode || 500;
    err.status = err.status || (err.statusCode >= 500 ? 'error' : 'fail');
    err.isOperational = err.isOperational ?? false;

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error: ApiError = err;

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
        if (err instanceof ZodError) error = handleZodError(err);

        sendErrorProd(error, res);
    }
};


