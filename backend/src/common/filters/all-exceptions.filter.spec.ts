import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: ArgumentsHost;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    const mockGetRequest = jest.fn().mockReturnValue({
      method: 'GET',
      url: '/api/test',
    });
    const mockSwitchToHttp = jest.fn().mockReturnValue({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    });
    mockHost = { switchToHttp: mockSwitchToHttp } as unknown as ArgumentsHost;

    loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  // ── HttpException: object body ────────────────────────────────────────────

  it('BadRequestException("msg") → 400 + NestJS existing body format', () => {
    filter.catch(new BadRequestException('msg'), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: 'msg' }),
    );
  });

  it('BadRequestException(["e1","e2"]) → 400 + message array maintained', () => {
    filter.catch(new BadRequestException(['e1', 'e2']), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      message: ['e1', 'e2'],
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('UnauthorizedException() → 401', () => {
    filter.catch(new UnauthorizedException(), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(401);
  });

  it('ForbiddenException() → 403', () => {
    filter.catch(new ForbiddenException(), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(403);
  });

  it('NotFoundException() → 404', () => {
    filter.catch(new NotFoundException(), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(404);
  });

  it('HttpException({ custom: true }, 418) → 418 + { custom: true } passed through', () => {
    filter.catch(new HttpException({ custom: true }, 418), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(418);
    expect(mockJson).toHaveBeenCalledWith({ custom: true });
  });

  // ── HttpException: string body ────────────────────────────────────────────

  it('new HttpException("msg", 418) → 418 + { statusCode: 418, message: "msg" }', () => {
    filter.catch(new HttpException('msg', 418), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(418);
    expect(mockJson).toHaveBeenCalledWith({ statusCode: 418, message: 'msg' });
  });

  // ── Non-HttpException ─────────────────────────────────────────────────────

  it('TypeError → 500 + { statusCode: 500, message: "Internal server error" }', () => {
    filter.catch(new TypeError('boom'), mockHost);
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('TypeError response does not expose exception message', () => {
    filter.catch(new TypeError('boom'), mockHost);
    // Exact match ensures 'boom' is not present in the response body
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('TypeError response does not expose stack', () => {
    filter.catch(new TypeError('boom'), mockHost);
    // Exact match ensures no 'stack' property is present in the response body
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('throw string → 500', () => {
    filter.catch('text error', mockHost);
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('throw null → 500', () => {
    filter.catch(null, mockHost);
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  // ── Logger ────────────────────────────────────────────────────────────────

  it('TypeError → logger.error is called with method/url info', () => {
    filter.catch(new TypeError('boom'), mockHost);
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('GET /api/test'),
      expect.any(String),
    );
  });

  it('throw string → logger.error is called with stringified value', () => {
    filter.catch('text error', mockHost);
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unhandled exception'),
      'text error',
    );
  });

  it('throw null → logger.error is called safely', () => {
    filter.catch(null, mockHost);
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unhandled exception'),
      'null',
    );
  });

  it('NotFoundException → logger.error is NOT called', () => {
    filter.catch(new NotFoundException(), mockHost);
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  it('BadRequestException → logger.error is NOT called', () => {
    filter.catch(new BadRequestException('msg'), mockHost);
    expect(loggerSpy).not.toHaveBeenCalled();
  });
});
