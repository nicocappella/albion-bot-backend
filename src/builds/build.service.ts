import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Build, type BuildDocument } from './build.schema';

@Injectable()
export class BuildService implements OnModuleInit {
  private readonly logger = new Logger(BuildService.name);

  constructor(
    @InjectModel(Build.name)
    private readonly buildModel: Model<BuildDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const count = await this.buildModel.countDocuments();
      this.logger.log(`Builds en DB: ${count}.`);
    } catch (error) {
      this.logger.error('Error al verificar builds:', error as Error);
    }
  }

  async findAll(): Promise<Build[]> {
    return this.buildModel.find().lean().exec() as Promise<Build[]>;
  }

  async findByKey(key: string): Promise<Build | undefined> {
    const doc = await this.buildModel.findOne({ key }).lean().exec();
    return (doc as Build | null) ?? undefined;
  }

  async findManyByKeys(keys: string[]): Promise<Map<string, Build>> {
    const docs = await this.buildModel
      .find({ key: { $in: keys } })
      .lean()
      .exec();
    return new Map((docs as Build[]).map((b) => [b.key, b]));
  }

  async upsert(data: Partial<Build> & { key: string }): Promise<Build> {
    const doc = await this.buildModel
      .findOneAndUpdate({ key: data.key }, { $set: data }, { upsert: true, new: true })
      .lean()
      .exec();
    return doc as Build;
  }

  async deleteByKey(key: string): Promise<boolean> {
    const result = await this.buildModel.deleteOne({ key }).exec();
    return result.deletedCount > 0;
  }
}
