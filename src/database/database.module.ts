import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        if (!uri) {
          throw new Error('Missing MONGO_URI. DatabaseModule is disabled.');
        }

        const database = configService.get<string>(
          'MONGO_DATABASE',
          'albion-guild-system',
        );

        return {
          uri,
          dbName: database,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
