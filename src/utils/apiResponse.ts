
import { Response } from 'express';

export interface ApiResponseData {
    success: boolean;
    message?: string;
    data?: any;
    errors?: any[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export class ApiResponse {
    static success(res: Response, data: any, message = 'Success', statusCode = 200) {
        const response: ApiResponseData = {
            success: true,
            message,
            data,
        };

        return res.status(statusCode).json(response);
    }

    static error(res: Response, message = 'Error', statusCode = 500, errors?: any[]) {
        const response: ApiResponseData = {
            success: false,
            message,
            ...(errors && { errors }),
        };

        return res.status(statusCode).json(response);
    }

    static paginated(
        res: Response,
        data: any,
        pagination: ApiResponseData['pagination'],
        message = 'Success'
    ) {
        const response: ApiResponseData = {
            success: true,
            message,
            data,
            pagination,
        };

        return res.status(200).json(response);
    }
}
