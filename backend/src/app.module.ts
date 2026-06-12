import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { ExerciseSetsModule } from './exercise-sets/exercise-sets.module';
import { ExercisesModule } from './exercises/exercises.module';
import { FollowsModule } from './follows/follows.module';
import { GoalsModule } from './goals/goals.module';
import { LikesModule } from './likes/likes.module';
import { PersonalRecordsModule } from './personal-records/personal-records.module';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';
import { WorkoutExercisesModule } from './workout-exercises/workout-exercises.module';
import { WorkoutPostsModule } from './workout-posts/workout-posts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService.get<string>('DB_USER', 'fitlog'),
        password: configService.get<string>('DB_PASSWORD', 'fitlog'),
        database: configService.get<string>('DB_NAME', 'fitlog'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    UsersModule,
    AuthModule,
    ExercisesModule,
    WorkoutPostsModule,
    WorkoutExercisesModule,
    ExerciseSetsModule,
    CommentsModule,
    LikesModule,
    FollowsModule,
    GoalsModule,
    PersonalRecordsModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
