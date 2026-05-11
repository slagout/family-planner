import { Request, Response, NextFunction } from 'express';

describe('keycloak-auth middleware', () => {
  it('rejects requests without Authorization header', async () => {
    const { keycloakAuth } = await import('../middleware/keycloak-auth');
    const req = { headers: {} } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await keycloakAuth(req as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests with malformed Authorization header', async () => {
    const { keycloakAuth } = await import('../middleware/keycloak-auth');
    const req = { headers: { authorization: 'Token abc123' } } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await keycloakAuth(req as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
