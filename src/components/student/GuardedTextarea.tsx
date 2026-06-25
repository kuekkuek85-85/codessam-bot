"use client";

import { useState } from "react";
import { filterText } from "@/lib/filter";
import { db, uid } from "@/lib/db";

// 안전 필터가 내장된 textarea (PRD §10).
// 차단 시 값 반영을 막고, 경고를 Firestore/로컬에 기록한다.
export default function GuardedTextarea({
  value,
  onChange,
  studentId,
  studentName,
  studentNo,
  placeholder,
  rows = 3,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  studentId?: string;
  studentName?: string;
  studentNo?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  function handle(v: string) {
    const res = filterText(v);
    if (res.blocked) {
      setNotice(res.notice ?? "입력할 수 없는 내용이 있어요.");
      if (studentId) {
        db().addWarning({
          id: uid("warn"),
          studentId,
          studentName,
          studentNo,
          type: res.type ?? "주제이탈",
          text: v.slice(0, 120),
          createdAt: Date.now(),
        });
      }
      return; // 값 반영하지 않음
    }
    setNotice(null);
    onChange(v);
  }

  return (
    <div>
      <textarea
        className={`field ${className} ${
          notice ? "border-red-300 ring-2 ring-red-100" : ""
        }`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => handle(e.target.value)}
      />
      {notice && (
        <p className="mt-1.5 text-sm font-semibold text-red-600">⚠️ {notice}</p>
      )}
    </div>
  );
}
