import { Request, Response, NextFunction, Router } from 'express';

// 將 router 內所有 handler 自動包上 async 錯誤捕捉，避免未處理的 promise rejection
// 讓請求 hang 成 504。捕捉到的錯誤交給全域 errorHandler。
export function wrapAsyncRouter(router: Router): Router {
  for (const layer of (router as any).stack) {
    const route = layer.route;
    if (!route) continue;
    for (const h of route.stack) {
      const orig = h.handle;
      if (orig.length >= 4) continue; // 已是 (err,req,res,next) 形式不包
      h.handle = (req: Request, res: Response, next: NextFunction) => {
        try {
          const r = orig(req, res, next);
          if (r && typeof r.catch === 'function') r.catch(next);
        } catch (e) {
          next(e);
        }
      };
    }
  }
  return router;
}

// 全域錯誤處理：把資料庫外鍵等錯誤轉成可讀訊息，其餘回 500（而非讓請求逾時）
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;

  // Prisma 外鍵約束（刪除被引用的資料）
  if (err?.code === 'P2003' || /foreign key constraint/i.test(err?.message ?? '')) {
    res.status(409).json({ error: '此資料已被其他紀錄使用，無法刪除（請先移除關聯的合約／紀錄）' });
    return;
  }
  // Prisma 查無紀錄
  if (err?.code === 'P2025') {
    res.status(404).json({ error: '找不到資料' });
    return;
  }

  console.error('Unhandled error:', err?.message ?? err);
  res.status(500).json({ error: '伺服器發生錯誤，請稍後再試' });
}
