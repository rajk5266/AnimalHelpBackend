// import { Request, Response, NextFunction } from 'express';

// export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
//     return (req: Request, res: Response, next: NextFunction) => {
//         fn(req, res, next).catch(next);
//     };
// };



// utils/catchAsync.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper function to catch async errors in Express route handlers
 * Eliminates the need for try-catch blocks in every async controller
 * 
 * @param fn - Async function (controller) to wrap
 * @returns Express middleware function
 */
export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Type-safe version for controllers with typed request objects
 */
export const catchAsyncTyped = <T extends Request>(
    fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: T, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};