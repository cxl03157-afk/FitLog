import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/search must be declared before GET /users/:id
  @Get('search')
  searchUsers(@Query() query: SearchUsersDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.searchUsers(query, user.sub);
  }

  @Get(':id')
  getProfile(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(id, user.sub);
  }

  @Patch('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Unsupported file type: ${file.mimetype}. Allowed: jpeg, png, webp`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds the 10MB size limit');
    }
    return this.usersService.uploadAvatar(user.sub, file);
  }

  @Patch('me/profile')
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }
}
