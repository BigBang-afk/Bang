import { ArrayUnique, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { BranchAccessType } from '@prisma/client';

export class AssignBranchesDto {
  @IsOptional()
  @IsEnum(BranchAccessType)
  branchAccessType?: BranchAccessType;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  branchIds!: string[];
}
