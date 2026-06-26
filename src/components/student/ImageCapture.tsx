"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/image";

// 문제 상황 캡처 첨부 (PRD §5 화면2 / §8 imageUrl).
// 붙여넣기(Ctrl+V) + 파일 선택 모두 지원. 첨부 즉시 압축해 data URL로 전달.
export default function ImageCapture({
  value,
  onChange,
}: {
  value?: string;
  onChange: (dataUrl?: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file?: Blob | null) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      onChange(await compressImage(file));
    } catch {
      setErr("이미지를 불러오지 못했어요. 다른 캡처로 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  // 페이지 어디서든 이미지 붙여넣기(Ctrl+V) 감지.
  // (텍스트 칸에 이미지를 붙여도 무의미하므로 전역 감지가 안전)
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/")
      );
      if (item) {
        e.preventDefault();
        handleFile(item.getAsFile());
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <label className="label">
        🖼️ 문제 상황 캡처 첨부 <span className="text-slate-400">(선택)</span>
      </label>

      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="첨부한 캡처"
            className="max-h-52 rounded-xl ring-1 ring-slate-200"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-slate-800 text-white shadow hover:bg-slate-900"
            aria-label="캡처 삭제"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-500 transition hover:border-brand-400 hover:bg-brand-50"
        >
          <span className="text-2xl">📷</span>
          <span className="text-sm font-semibold text-slate-600">
            {busy ? "처리 중…" : "클릭해 이미지 선택"}
          </span>
          <span className="text-xs text-slate-400">
            또는 스크래치 화면을 캡처(⊞+Shift+S)한 뒤 Ctrl+V 로 붙여넣기
          </span>
        </button>
      )}

      {err && <p className="mt-1.5 text-sm text-red-600">{err}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
