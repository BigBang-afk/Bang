import { Body, Controller, Get, Ip, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.interface';
import { PERMISSIONS } from '../permissions.constants';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  // Reference/picklist data (branch dropdown for user assignment) — any
  // authenticated user may read it, no extra permission required.
  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BRANCHES_MANAGE)
  create(
    @Body() dto: CreateBranchDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.branchesService.create(dto, user.userId, ip, req.headers['user-agent'] as string);
  }
}
