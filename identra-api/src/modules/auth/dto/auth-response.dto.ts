import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthServiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  url: string;
}

export class AuthUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  imageUrl: string | null;

  @ApiProperty()
  role: string;

  @ApiProperty({ type: [AuthServiceResponseDto] })
  services: AuthServiceResponseDto[];
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user: AuthUserResponseDto;
}
