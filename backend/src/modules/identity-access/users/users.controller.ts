import { Body, Controller, Get, Ip, Param, Patch, Post, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.interface';
import { PERMISSIONS } from '../permissions.constants';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { AssignBranchesDto } from './dto/assign-branches.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.userId);
  }

  @Patch('me/password')
  changeOwnPassword(
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

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_CREATE)
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.usersService.create(dto, user.userId, ip, req.headers['user-agent'] as string);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.usersService.update(id, dto, user.userId, ip, req.headers['user-agent'] as string);
  }

  @Post(':id/disable')
  @RequirePermissions(PERMISSIONS.USERS_DISABLE)
  disable(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.usersService.disable(id, user.userId, ip, req.headers['user-agent'] as string);
  }

  // Gated by roles.manage, not users.update: assigning a role is granting
  // permissions, so it belongs behind the same permission that controls
  // role definitions — a user with only users.update (e.g. HR-style data
  // entry) must not be able to promote anyone, including themselves.
  @Put(':id/roles')
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE)
  assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.usersService.assignRoles(
      id,
      dto.roleIds,
      user.userId,
      ip,
      req.headers['user-agent'] as string,
    );
  }

  @Put(':id/branches')
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  assignBranches(
    @Param('id') id: string,
    @Body() dto: AssignBranchesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.usersService.assignBranches(
      id,
      dto.branchAccessType,
      dto.branchIds,
      user.userId,
      ip,
      req.headers['user-agent'] as string,
    );
  }
}
