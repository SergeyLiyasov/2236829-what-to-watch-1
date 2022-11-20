export const Component = {
  Application: Symbol.for('Application'),
  LoggerInterface: Symbol.for('LoggerInterface'),
  ConfigInterface: Symbol.for('ConfigInterface'),
  DatabaseInterface: Symbol.for('DatabaseInterface'),
  UserServiceInterface: Symbol.for('UserServiceInterface'),
  MovieServiceInterface: Symbol.for('MovieServiceInterface'),
  UserModel: Symbol.for('UserModel'),
  MovieModel: Symbol.for('MovieModel'),
  CommentModel: Symbol.for('CommentModel'),
  CommentServiceInterface: Symbol.for('CommentServiceInterface'),
  MovieController: Symbol.for('MovieController'),
  ExceptionFilterInterface: Symbol.for('ExceptionFilterInterface'),
} as const;
