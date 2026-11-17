import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Sistema Financeiro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'WEB' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'https://financeiro.example.com' })
  @IsUrl()
  @IsNotEmpty()
  url: string;
}
