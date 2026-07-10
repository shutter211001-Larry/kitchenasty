import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { categorySchema, menuItemSchema, orderSchema } from './schema.js';
import { api } from '../api.js'; // Adjust path if needed

// 註冊常用擴充套件
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

let dbPromise: any = null;

const createDatabase = async () => {
  const db = await createRxDatabase({
    name: 'shutter_pos_localdb',
    storage: getRxStorageDexie(), // 底層使用 Dexie (IndexedDB)
    multiInstance: true,          // 允許跨分頁同步
    eventReduce: true             // 優化查詢效能
  });

  // 建立集合 (Tables)
  await db.addCollections({
    categories: { schema: categorySchema },
    menuItems: { schema: menuItemSchema },
    orders: { schema: orderSchema }
  });

  // 設定 Replication (Pull from Server)
  const setupPull = (collection: any, name: string) => {
    replicateRxCollection({
      collection,
      replicationIdentifier: `pull_${name}`,
      pull: {
        async handler(lastCheckpoint: any) {
          if (!localStorage.getItem('token')) {
            throw new Error('Authentication required');
          }
          try {
            const query = new URLSearchParams();
            if (lastCheckpoint) {
              if (lastCheckpoint.updatedAt) query.set('lastUpdatedAt', lastCheckpoint.updatedAt);
              if (lastCheckpoint.id) query.set('lastId', lastCheckpoint.id);
            }
            const res = await api.get<{ documents: any[], checkpoint: any, hasMoreDocuments: boolean }>(
              `/replication/pull/${name}?${query.toString()}`
            );
            return res;
          } catch (err: any) {
            if (err.message !== 'Authentication required') {
              console.error(`[RxDB Pull Error] ${name}:`, err);
            }
            throw err;
          }
        }
      },
      push: {
        async handler(docs) {
          if (name !== 'orders') return []; // 唯讀集合不推播
          if (!localStorage.getItem('token')) {
            throw new Error('Authentication required');
          }
          try {
            const pushDocs = docs.map(d => d.newDocumentState);
            const res = await api.post<{ success: boolean, conflicts: any[] }>(`/replication/push/${name}`, {
              documents: pushDocs
            });
            // 標記已同步
            for (const p of pushDocs) {
              const localDoc = await collection.findOne(p.id).exec();
              if (localDoc) await localDoc.patch({ _isSynced: true });
            }
            return res.conflicts || [];
          } catch (err: any) {
            if (err.message !== 'Authentication required') {
              console.error(`[RxDB Push Error] ${name}:`, err);
            }
            throw err;
          }
        }
      }
    });
  };

  setupPull(db.categories, 'categories');
  setupPull(db.menuItems, 'menuItems');
  setupPull(db.orders, 'orders');

  console.log('[RxDB] 初始化與雙向同步機制已掛載完成。');
  
  return db;
};

// Singleton 模式，確保整個 App 共用同一個 DB 實體
export const getDatabase = () => {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
};
