import asyncHandler from 'express-async-handler';
import { injectable } from 'inversify';
import { Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { LoggerInterface } from '../logger/logger.interface.js';
import { RouteInterface } from '../../types/route.interface.js';
import { ControllerInterface } from './controller.interface.js';

@injectable()
export abstract class Controller implements ControllerInterface {
  private readonly _router: Router;

  constructor(protected readonly logger: LoggerInterface) {
    this._router = Router();
  }

  get router() {
    return this._router;
  }

  public addRoute<P, ResBody, ReqBody, ReqQuery>(
    route: RouteInterface<P, ResBody, ReqBody, ReqQuery, Record<string, unknown>>
  ) {
    const routeHandler = asyncHandler(route.handler.bind(this));
    const middlewares = route.middlewares?.map(
      (middleware) => asyncHandler(middleware.execute.bind(middleware))
    );

    if (middlewares) {
      this._router[route.method](route.path, ...middlewares, routeHandler);
    } else {
      this._router[route.method](route.path, routeHandler);
    }
    this.logger.info(`Добавлен обработчик запросов: ${route.method.toUpperCase()} ${route.path}`);
  }

  public send<T>(res: Response<T>, statusCode: number, data: T): void {
    res
      .type('application/json')
      .status(statusCode)
      .json(data);
  }

  public created<T>(res: Response<T>, data: T): void {
    this.send(res, StatusCodes.CREATED, data);
  }

  public noContent(res: Response): void {
    res.status(StatusCodes.NO_CONTENT).send();
  }

  public ok<T>(res: Response<T>, data: T): void {
    this.send(res, StatusCodes.OK, data);
  }
}
