import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { Controller } from '../../common/controller/controller.js';
import { Component } from '../../types/component.type.js';
import { LoggerInterface } from '../../common/logger/logger.interface.js';
import { HttpMethod } from '../../types/http-method.enum.js';
import { MovieServiceInterface } from './movie-service.interface.js';
import MovieListItemResponse from './response/movie-list-item.response.js';
import { fillDto } from '../../utils/common.js';
import CreateMovieDto from './dto/create-movie.dto.js';
import UpdateMovieDto from './dto/update-movie.dto.js';
import { Genre } from '../../types/genre.type.js';
import MovieResponse from './response/movie.response.js';
import { ConfigInterface } from '../../common/config/config.interface.js';
import HttpError from '../../common/errors/http-error.js';
import { StatusCodes } from 'http-status-codes';
import CreateCommentDto from '../comment/dto/create-comment.dto.js';
import CommentResponse from '../comment/response/comment.response.js';
import { CommentServiceInterface } from '../comment/comment-service.interface.js';
import { ValidateObjectIdMiddleware } from '../../common/middlewares/validate-objectid.middleware.js';
import { ValidateDtoMiddleware } from '../../common/middlewares/validate-dto.middleware.js';
import ValidationError from '../../common/errors/validation-error.js';
import { DocumentExistsMiddleware } from '../../common/middlewares/document-exists.middleware.js';
import { AuthorizeMiddleware } from '../../common/middlewares/authorize.middleware.js';
import { ToWatchServiceInterface } from '../to-watch/to-watch-service.interface.js';
import AddToToWatchDto from '../to-watch/dto/add-to-to-watch.dto.js';
import DeleteFromToWatchDto from '../to-watch/dto/delete-from-to-watch.dto.js';

@injectable()
export default class MovieController extends Controller {
  constructor(
    @inject(Component.MovieServiceInterface)
    private readonly movieService: MovieServiceInterface,
    @inject(Component.CommentServiceInterface)
    private readonly commentService: CommentServiceInterface,
    @inject(Component.ToWatchServiceInterface)
    private readonly toWatchService: ToWatchServiceInterface,
    @inject(Component.ConfigInterface)
    configService: ConfigInterface,
    @inject(Component.LoggerInterface)
    logger: LoggerInterface,
  ) {
    super(logger, configService);

    this.logger.info('Регистрация эндпоинтов для MovieController…');

    const validateObjectIdMiddleware = new ValidateObjectIdMiddleware('id');
    const validateCommentDtoMiddleware = new ValidateDtoMiddleware(CreateCommentDto);
    const validateCreateMovieDtoMiddleware = new ValidateDtoMiddleware(CreateMovieDto);
    const validateUpdateMovieDtoMiddleware = new ValidateDtoMiddleware(UpdateMovieDto);
    const validateAddToToWatchDtoMiddleware = new ValidateDtoMiddleware(AddToToWatchDto);
    const validateDeleteFromToWatchDtoMiddleware = new ValidateDtoMiddleware(DeleteFromToWatchDto);
    const movieExistsMiddleware = new DocumentExistsMiddleware(movieService, 'Movie', 'id');
    const authorizationMiddleware = new AuthorizeMiddleware();

    this.addRoute({path: '/', method: HttpMethod.Get, handler: this.getAll});

    this.addRoute({
      path: '/',
      method: HttpMethod.Post,
      handler: this.create,
      middlewares: [authorizationMiddleware, validateCreateMovieDtoMiddleware]
    });

    this.addRoute({path: '/promo', method: HttpMethod.Get, handler: this.getPromo});

    this.addRoute({
      path: '/to-watch',
      method: HttpMethod.Get,
      handler: this.getToWatchList,
      middlewares: [authorizationMiddleware]
    });

    this.addRoute({
      path: '/to-watch',
      method: HttpMethod.Post,
      handler: this.addToToWatchList,
      middlewares: [authorizationMiddleware, validateAddToToWatchDtoMiddleware]
    });

    this.addRoute({
      path: '/to-watch',
      method: HttpMethod.Delete,
      handler: this.deleteFromToWatchList,
      middlewares: [authorizationMiddleware, validateDeleteFromToWatchDtoMiddleware]
    });

    this.addRoute({
      path: '/:id/comments',
      method: HttpMethod.Get,
      handler: this.getComments,
      middlewares: [validateObjectIdMiddleware, movieExistsMiddleware]
    });

    this.addRoute({
      path: '/:id/comments',
      method: HttpMethod.Post,
      handler: this.createComment,
      middlewares: [authorizationMiddleware, validateObjectIdMiddleware, validateCommentDtoMiddleware, movieExistsMiddleware]
    });

    this.addRoute({
      path: '/:id',
      method: HttpMethod.Get,
      handler: this.getById,
      middlewares: [validateObjectIdMiddleware, movieExistsMiddleware]
    });

    this.addRoute({
      path: '/:id',
      method: HttpMethod.Put,
      handler: this.update,
      middlewares: [authorizationMiddleware, validateObjectIdMiddleware, validateUpdateMovieDtoMiddleware, movieExistsMiddleware]
    });

    this.addRoute({
      path: '/:id',
      method: HttpMethod.Delete,
      handler: this.deleteById,
      middlewares: [authorizationMiddleware, validateObjectIdMiddleware, movieExistsMiddleware]
    });
  }

  public async getAll(
    req: Request<Record<string, unknown>, MovieListItemResponse[], Record<string, unknown>, {genre?: Genre, limit?: number}>,
    res: Response<MovieListItemResponse[]>
  ): Promise<void> {
    const movies = req.query.genre
      ? await this.movieService.findByGenre(req.query.genre, req.query.limit)
      : await this.movieService.getAll(req.query.limit);
    this.ok(res, fillDto(MovieListItemResponse, movies));
  }

  public async getById(
    req: Request<{id: string}, MovieResponse>,
    res: Response<MovieResponse>
  ): Promise<void> {
    const movie = await this.movieService.findById(req.params.id);
    if (!movie) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        'Фильм не найден',
        'MovieController',
      );
    }
    this.ok(res, fillDto(MovieResponse, {...movie, rating: movie.rating}));
  }

  public async getPromo(
    _req: Request<Record<string, unknown>, MovieResponse>,
    res: Response<MovieResponse>
  ): Promise<void> {
    const movie = await this.movieService.findById(this.configService.get('PROMO_MOVIE_ID'));
    if (!movie) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        'Фильм не найден',
        'MovieController',
      );
    }
    this.ok(res, fillDto(MovieResponse, {...movie, rating: movie.rating}));
  }

  public async create(
    req: Request<Record<string, unknown>, MovieResponse | ValidationError[], CreateMovieDto>,
    res: Response<MovieResponse | ValidationError[]>
  ): Promise<void> {
    const result = await this.movieService.create(req.user.id, req.body);
    this.created(res, fillDto(MovieResponse, {...result, rating: 0}));
  }

  public async update(
    req: Request<{id: string}, MovieResponse | ValidationError[], UpdateMovieDto>,
    res: Response<MovieResponse | ValidationError[]>
  ): Promise<void> {
    const result = await this.movieService.update(req.params.id, req.user.id, req.body);
    if (!result) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        'Фильм не найден',
        'MovieController',
      );
    }
    this.created(res, fillDto(MovieResponse, {...result, rating: result.rating}));
  }

  public async deleteById(
    req: Request<{id: string}>,
    res: Response
  ): Promise<void> {
    await this.movieService.deleteById(req.params.id);
    this.noContent(res);
  }

  public async getToWatchList(
    req: Request<Record<string, unknown>, MovieListItemResponse[]>,
    res: Response<MovieListItemResponse[]>
  ): Promise<void> {
    const result = await this.toWatchService.getToWatch(req.user.id);
    this.ok(res, fillDto(MovieListItemResponse, result?.list ?? []));
  }

  public async addToToWatchList(
    req: Request<Record<string, unknown>, Record<string, unknown>, AddToToWatchDto>,
    res: Response<Record<string, unknown>>
  ): Promise<void> {
    if (await this.movieService.exists(req.body.movieId)) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        'Фильм не найден',
        'MovieController',
      );
    }
    await this.toWatchService.addToToWatch(req.user.id, req.body.movieId);
    this.noContent(res);
  }

  public async deleteFromToWatchList(
    req: Request<Record<string, unknown>, Record<string, unknown>, DeleteFromToWatchDto>,
    res: Response<Record<string, unknown>>
  ): Promise<void> {
    if (await this.movieService.exists(req.body.movieId)) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        'Фильм не найден',
        'MovieController',
      );
    }
    await this.toWatchService.deleteFromToWatch(req.user.id, req.body.movieId);
    this.noContent(res);
  }

  public async getComments(
    req: Request<{id: string}, CommentResponse[]>,
    res: Response<CommentResponse[]>
  ): Promise<void> {
    const comments = await this.commentService.findByMovieId(req.params.id);
    this.ok(res, fillDto(CommentResponse, comments));
  }

  public async createComment(
    req: Request<{id: string}, CommentResponse | ValidationError[], CreateCommentDto>,
    res: Response<CommentResponse | ValidationError[]>
  ): Promise<void> {
    const comment = await this.commentService.create(req.params.id, req.user.id, req.body);
    if (!comment) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        'Комментарий не найден',
        'MovieController',
      );
    }
    this.created(res, fillDto(CommentResponse, comment));
  }
}
