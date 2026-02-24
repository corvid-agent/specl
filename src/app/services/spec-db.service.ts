import { Injectable } from '@angular/core';
import Dexie, { type Table } from 'dexie';
import { type Spec } from '../models/spec.model';

class SpeclDatabase extends Dexie {
  specs!: Table<Spec, number>;

  constructor() {
    super('specl');
    this.version(1).stores({
      specs: '++id, filename, suite, [suite+filename], frontmatter.module',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class SpecDbService {
  private readonly db = new SpeclDatabase();

  async getAll(): Promise<Spec[]> {
    return this.db.specs.toArray();
  }

  async getBySuite(suite: string): Promise<Spec[]> {
    return this.db.specs.where('suite').equals(suite).toArray();
  }

  async getById(id: number): Promise<Spec | undefined> {
    return this.db.specs.get(id);
  }

  async save(spec: Spec): Promise<number> {
    spec.updatedAt = new Date().toISOString();
    if (spec.id) {
      await this.db.specs.put(spec);
      return spec.id;
    }
    return this.db.specs.add(spec);
  }

  async delete(id: number): Promise<void> {
    await this.db.specs.delete(id);
  }

  async deleteAll(): Promise<void> {
    await this.db.specs.clear();
  }

  async getSuites(): Promise<string[]> {
    const all = await this.db.specs.orderBy('suite').uniqueKeys();
    return all as string[];
  }

  async importBulk(specs: Spec[]): Promise<void> {
    await this.db.specs.bulkAdd(specs);
  }
}
