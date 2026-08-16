import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.interface';
import { AppConfigService } from '../../../common/config/app-config.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { MfaCodeDto } from './dto/mfa-code.dto';

const REFRESH_COOKIE_NAME = 'bang_refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
  ) {}

  private baseCookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax' as const,
      path: '/api/auth',
    };
  }

  private cookieOptions() {
    return {
      ...this.baseCookieOptions(),
      maxAge: this.config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password, dto.totpCode, {
      ip,
      userAgent: req.headers['user-agent'] as string,
    });

    if (result.mfaRequired) {
      return { mfaRequired: true };
    }

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions());
    return { accessToken: result.accessToken, user: result.user };
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

    const result = await this.authService.refresh(raw, {
      ip,
      userAgent: req.headers['user-agent'] as string,
    });

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, this.cookieOptions());
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Ip() ip: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(raw, { ip, userAgent: req.headers['user-agent'] as string });
    res.clearCookie(REFRESH_COOKIE_NAME, this.baseCookieOptions());
    return { success: true };
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.authService.requestPasswordReset(dto.email, {
      ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  @Public()
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
