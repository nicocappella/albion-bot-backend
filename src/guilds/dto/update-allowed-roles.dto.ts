import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsString, ValidateNested } from 'class-validator';
import { AccessLevel } from '../guild.schema';

class AllowedRoleDto {
  @IsString()
  roleId: string;

  @IsString()
  roleName: string;

  @IsEnum(AccessLevel)
  accessLevel: AccessLevel;
}

export class UpdateAllowedRolesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllowedRoleDto)
  roles: AllowedRoleDto[];
}
