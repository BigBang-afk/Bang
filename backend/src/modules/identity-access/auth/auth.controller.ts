import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.interface';
import { AppConfigService } from '../../../common/config/app-config.service';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { ChangePasswordDto } from '../users/dto/change-password.dto';
import { MfaCodeDto } from './dto/mfa-code.dto';

const REFRESH_COOKIE_NAME = 'zarghoon_refresh_token';
const CSRF_COOKIE_NAME = 'zarghoon_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly config: AppConfigService,
  ) {}

  private baseCookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax' as const,
      path: '/api/v1/auth',
    };
  }

  private cookieOptions() {
    return {
      ...this.baseCookieOptions(),
      maxAge: this.config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
    };
  }

  /**
   * Double-submit CSRF cookie: a non-httpOnly token set alongside the
   * httpOnly refresh cookie. A cross-site request can rely on the browser
   * auto-attaching the refresh cookie, but it cannot read that cookie's
   * value to also send it as a header — only same-origin JS can. Endpoints
   * that act purely on the ambient refresh cookie (refresh, logout) require
   * the header to match.
   */
  private setCsrfCookie(res: Response): string {
    const token = randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: this.config.isProduction,
      sameSite: 'lax' as const,
      path: '/api/v1/auth',
      maxAge: this.config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
    });
    return token;
  }

  private assertCsrf(req: Request) {
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME];
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('Missing or invalid CSRF token');
    }
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.identifier, dto.password, dto.totpCode, {
      ip,
      userAgent: req.headers['user-agent'] as string,
    });

    if (result.mfaRequired) {
      return { mfaRequired: true };
    }

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions());
    const csrfToken = this.setCsrfCookie(res);
    return { accessToken: result.accessToken, user: result.user, csrfToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Ip() ip: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!raw) {
      res.clearCookie(REFRESH_COOKIE_NAME, this.baseCookieOptions());
      throw new UnauthorizedException('No session');
    }
    this.assertCsrf(req);

    const result = await this.authService.refresh(raw, {
      ip,
      userAgent: req.headers['user-agent'] as string,
    });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions());
    const csrfToken = this.setCsrfCookie(res);
    return { accessToken: result.accessToken, user: result.user, csrfToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Ip() ip: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    if (raw) {
      this.assertCsrf(req);
    }
    await this.authService.logout(raw, { ip, userAgent: req.headers['user-agent'] as string });
    res.clearCookie(REFRESH_COOKIE_NAME, this.baseCookieOptions());
    res.clearCookie(CSRF_COOKIE_NAME, this.baseCookieOptions());
    return { success: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.authService.requestPasswordReset(dto.identifier, {
      ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  confirmPasswordReset(
    @Body() dto: ConfirmPasswordResetDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.authService.confirmPasswordReset(dto.token, dto.newPassword, {
      ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  // Alias for /users/me/password so the API surface matches the spec's
  // documented endpoint list (POST /api/v1/auth/change-password); delegates
  // straight to UsersService rather than duplicating the logic.
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.usersService.changePassword(
      user.userId,
      dto,
      ip,
      req.headers['user-agent'] as string,
    );
  }

  @Post('mfa/enroll')
  @HttpCode(HttpStatus.OK)
  mfaEnrollStart(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.mfaEnrollStart(user.userId);
  }

  @Post('mfa/enroll/confirm')
  @HttpCode(HttpStatus.OK)
  mfaEnrollConfirm(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaCodeDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.authService.mfaEnrollConfirm(user.userId, dto.code, {
      ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  mfaDisable(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaCodeDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.authService.mfaDisable(user.userId, dto.code, {
      ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }
}
