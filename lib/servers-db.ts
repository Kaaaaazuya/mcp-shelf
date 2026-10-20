import { servers, tools } from '@schema';
import { db } from 'void/db';
import { toServers, type Server } from './servers';

/** 掲載データを D1 から読む。件数が少ないので 2 テーブルとも丸ごと読んで組み立てる */
export async function loadServers(siteUrl: string): Promise<Server[]> {
  const [serverRows, toolRows] = await db.batch([
    db.select().from(servers),
    db.select().from(tools),
  ]);
  return toServers(serverRows, toolRows, siteUrl);
}
