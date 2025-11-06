import { IsString, IsNumber, IsBoolean, IsOptional, IsObject, Min, Max } from 'class-validator';

export class CreateProxyConfigDto {
  @IsString()
  projectName: string;

  @IsString()
  targetHost: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  targetPort: number;

  @IsOptional()
  @IsObject()
  customHeaders?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProxyConfigDto {
  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsString()
  targetHost?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  targetPort?: number;

  @IsOptional()
  @IsObject()
  customHeaders?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ProxyRequestDto {
  @IsString()
  projectName: string;

  @IsOptional()
  @IsObject()
  additionalHeaders?: Record<string, string>;
}