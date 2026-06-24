import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePersonalRecordDto } from './dto/create-personal-record.dto';
import { UpdatePersonalRecordDto } from './dto/update-personal-record.dto';
import { PersonalRecordsService } from './personal-records.service';

@ApiTags('personal-records')
@ApiBearerAuth()
@Controller('personal-records')
@UseGuards(JwtAuthGuard)
export class PersonalRecordsController {
  constructor(
    private readonly personalRecordsService: PersonalRecordsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'パーソナルレコード一覧取得' })
  @ApiQuery({
    name: 'exerciseId',
    required: false,
    description: '種目 ID でフィルタ',
  })
  @ApiQuery({
    name: 'recordType',
    required: false,
    enum: ['MAX_WEIGHT', 'MAX_REPS'],
    description: 'レコードタイプでフィルタ',
  })
  @ApiOkResponse({ description: 'PersonalRecord entity[]' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('exerciseId') exerciseId?: string,
    @Query('recordType') recordType?: string,
  ) {
    return this.personalRecordsService.findAll(
      user.sub,
      exerciseId,
      recordType,
    );
  }

  @Post()
  @ApiOperation({ summary: 'パーソナルレコード登録' })
  @ApiCreatedResponse({ description: '作成された PersonalRecord entity' })
  @ApiBadRequestResponse({
    description:
      '400: recordType に対応するフィールド（weightKg / reps）が未指定',
  })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  create(
    @Body() dto: CreatePersonalRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.personalRecordsService.create(dto, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'パーソナルレコード詳細取得' })
  @ApiParam({ name: 'id', description: 'PersonalRecord ID' })
  @ApiOkResponse({ description: 'PersonalRecord entity' })
  @ApiNotFoundResponse({ description: 'レコードが存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.personalRecordsService.findOne(id, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'パーソナルレコード更新' })
  @ApiParam({ name: 'id', description: 'PersonalRecord ID' })
  @ApiOkResponse({ description: '更新後の PersonalRecord entity' })
  @ApiNotFoundResponse({ description: 'レコードが存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonalRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.personalRecordsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'パーソナルレコード削除' })
  @ApiParam({ name: 'id', description: 'PersonalRecord ID' })
  @ApiNoContentResponse({ description: '削除成功' })
  @ApiNotFoundResponse({ description: 'レコードが存在しない' })
  @ApiUnauthorizedResponse({ description: '認証トークンが無効' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.personalRecordsService.remove(id, user.sub);
  }
}
