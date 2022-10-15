import 'reflect-metadata';
import { Container } from 'inversify';
import Application from './app/application.js';
import LoggerService from './common/logger/logger.service.js';
import ConfigService from './common/config/config.service.js';
import { LoggerInterface } from './common/logger/logger.interface.js';
import { ConfigInterface } from './common/config/config.interface.js';
import { Component } from './types/component.type.js';

const applicationContainer = new Container();
applicationContainer.bind<Application>(Component.Application).to(Application).inSingletonScope();
applicationContainer.bind<LoggerInterface>(Component.LoggerInterface).to(LoggerService).inSingletonScope();
applicationContainer.bind<ConfigInterface>(Component.ConfigInterface).to(ConfigService).inSingletonScope();

const application = applicationContainer.get<Application>(Component.Application);
await application.init();
