import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import api from '../api/client';

// 共用匯出按鈕：呼叫 /api/export/:type?format=excel|pdf 下載檔案
export default function ExportButtons({ type }: { type: string }) {
  const [busy, setBusy] = useState<'excel' | 'pdf' | null>(null);

  async function download(format: 'excel' | 'pdf') {
    setBusy(format);
    try {
      const res = await api.get(`/export/${type}?format=${format}`, { responseType: 'blob' });
      // 從 Content-Disposition 取檔名（filename*=UTF-8''xxx）
      const cd = res.headers['content-disposition'] || '';
      const m = /filename\*=UTF-8''([^;]+)/.exec(cd);
      const filename = m ? decodeURIComponent(m[1]) : `${type}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e: any) {
      alert(e?.response?.status === 403 ? '您沒有匯出此資料的權限' : '匯出失敗');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => download('excel')}
        disabled={busy !== null}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 hover:border-brand hover:text-brand transition-colors flex items-center gap-1 disabled:opacity-50"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />{busy === 'excel' ? '匯出中…' : 'Excel'}
      </button>
      <button
        onClick={() => download('pdf')}
        disabled={busy !== null}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 hover:border-brand hover:text-brand transition-colors flex items-center gap-1 disabled:opacity-50"
      >
        <FileText className="w-3.5 h-3.5" />{busy === 'pdf' ? '匯出中…' : 'PDF'}
      </button>
    </div>
  );
}
