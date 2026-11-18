"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpenCheck,
  Clock,
  Eye,
  FileText,
  FileUp,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  loadLocalSessions,
  removeLocalSession,
  saveLocalSession,
} from "@/lib/client-sessions";
import { PrivacyModal } from "@/components/PrivacyModal";
import type { LocalRecentSession, SessionPayload } from "@/types/paper";

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<LocalRecentSession[]>(
    []
  );
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setRecentSessions(loadLocalSessions());
  }, []);

  const handleUploadFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      if (
        !file.name.toLowerCase().endsWith(".pdf") &&
        file.type !== "application/pdf"
      ) {
        setUploadError(
          "Vui lòng chọn tệp định dạng PDF (.pdf) của bài báo tiếng Anh."
        );
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/sessions", {
          method: "POST",
          body: formData,
        });

        const data = (await res.json()) as {
          sessionId?: string;
          sessionSecret?: string;
          payload?: SessionPayload;
          errorVi?: string;
        };

        if (!res.ok || !data.sessionId || !data.sessionSecret || !data.payload) {
          setUploadError(
            data.errorVi || "Không thể tải tệp PDF lên. Vui lòng thử lại."
          );
          setUploading(false);
          return;
        }

        saveLocalSession({
          sessionId: data.sessionId,
          sessionSecret: data.sessionSecret,
          fileName: data.payload.fileName,
          createdAt: data.payload.createdAt,
          expiresAt: data.payload.expiresAt,
        });

        router.push(`/doc/${data.sessionId}`);
      } catch {
        setUploadError(
          "Lỗi kết nối mạng khi tải tệp PDF lên máy chủ. Vui lòng thử lại."
        );
        setUploading(false);
      }
    },
    [router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (uploading) return;
      const file = e.dataTransfer.files?.[0];
      if (file) {
        void handleUploadFile(file);
      }
    },
    [uploading, handleUploadFile]
  );

  const handleDeleteRecent = async (item: LocalRecentSession) => {
    setDeletingId(item.sessionId);
    try {
      await fetch(`/api/sessions/${item.sessionId}`, {
        method: "DELETE",
        headers: { "x-session-secret": item.sessionSecret },
      });
    } catch {
      // Ignore network failure and remove local reference
    } finally {
      removeLocalSession(item.sessionId);
      setRecentSessions(loadLocalSessions());
      setDeletingId(null);
    }
  };

  const formatRemainingHours = (expiresIso: string): string => {
    const diffMs = new Date(expiresIso).getTime() - Date.now();
    if (diffMs <= 0) return "Đã hết hạn";
    const hrs = Math.floor(diffMs / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    return hrs > 0 ? `Còn lưu ${hrs} giờ ${mins} phút` : `Còn lưu ${mins} phút`;
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-xs">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900">
                Đọc hiểu Bài báo Khoa học
              </span>
              <span className="ml-2 hidden rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 sm:inline">
                Tiếng Anh PDF → Phân tích Tiếng Việt có dẫn chứng
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              Quyền riêng tư & Xử lý dữ liệu
            </button>
            <button
              type="button"
              onClick={() => router.push("/doc/demo")}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-900 hover:bg-teal-100"
            >
              <Eye className="h-4 w-4" />
              Xem mẫu minh họa
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Đọc hiểu nhanh bài báo tiếng Anh, kiểm chứng trực tiếp trên PDF gốc
          </h1>
          <p className="mx-auto mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Hỗ trợ nhóm nghiên cứu Khoa học, Trí tuệ nhân tạo (AI), Thủy điện và
            các ngành liên quan nắm đúng phương pháp, điều kiện biên, kết quả và
            giới hạn nghiên cứu — tách bạch rõ kết luận của tác giả với nhận xét
            của AI.
          </p>
        </div>

        {/* Prominent Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!uploading) fileInputRef.current?.click();
          }}
          className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${
            isDragging
              ? "border-teal-600 bg-teal-50/70"
              : "border-slate-300 bg-white hover:border-teal-500 hover:bg-slate-50/60"
          } shadow-xs`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUploadFile(f);
              e.target.value = "";
            }}
          />

          {uploading ? (
            <div className="flex flex-col items-center py-3">
              <Loader2 className="h-11 w-11 animate-spin text-teal-700" />
              <p className="mt-3 text-base font-semibold text-slate-900">
                Đang kiểm tra tệp PDF và khởi tạo phiên làm việc riêng...
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Vui lòng giữ trang trong giây lát.
              </p>
            </div>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-200">
                <FileUp className="h-7 w-7" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900 sm:text-lg">
                Kéo thả tệp PDF bài báo tiếng Anh vào đây
              </p>
              <p className="mt-1 text-sm text-slate-600">
                hoặc{" "}
                <span className="font-semibold text-teal-700 underline underline-offset-2">
                  chọn tệp PDF từ thiết bị của bạn
                </span>
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Hỗ trợ PDF văn bản & bản scan (OCR)
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Tối ưu bài báo tiêu chuẩn (≤ 50 trang, ≤ 30 MB)
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Giữ bản PDF gốc để bấm dẫn chứng đối chiếu
                </span>
              </div>
            </>
          )}
        </div>

        {uploadError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">Không thể tải tài liệu</p>
              <p className="mt-0.5">{uploadError}</p>
            </div>
          </div>
        )}

        {/* Journey overview cards */}
        <div className="mt-7 grid gap-3 sm:grid-cols-4">
          {[
            [
              "1. Tải PDF tiếng Anh",
              "Vào dùng ngay không cần đăng nhập; nhận diện tự động văn bản và trang scan.",
            ],
            [
              "2. Hiểu theo 3 mức",
              "Hiểu nhanh 5 câu cốt lõi → Phân tích đầy đủ theo ngành → Đọc sâu từng mục & công thức.",
            ],
            [
              "3. Kiểm tra dẫn chứng",
              "Bấm thẻ trang để mở đúng vị trí trên PDF gốc; phân biệt trang tệp PDF và trang in.",
            ],
            [
              "4. Hỏi sâu & Gửi Zalo",
              "Đặt câu hỏi tiếng Việt và sao chép định dạng sạch gửi thảo luận nhóm Zalo hoặc tải .md.",
            ],
          ].map(([stepTitle, desc]) => (
            <div
              key={stepTitle}
              className="rounded-xl border border-slate-200/90 bg-white p-3.5"
            >
              <p className="text-xs font-bold text-teal-800">{stepTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* Privacy Notice Bar */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-100/80 px-4 py-3 text-xs leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">
            Minh bạch phiên làm việc:{" "}
          </span>
          Tài liệu không tự động công khai và không tạo thư viện chung. Văn bản
          & ảnh trang cần OCR được xử lý qua <strong>Google Gemini API</strong>.
          Phiên làm việc tự động xóa khỏi máy chủ sau <strong>24 giờ</strong>{" "}
          (hoặc xóa ngay bất kỳ lúc nào).{" "}
          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            className="cursor-pointer font-semibold text-teal-800 underline underline-offset-2"
          >
            Xem chi tiết giới hạn & cơ chế bảo vệ
          </button>
          .
        </div>

        {/* Recent Local Sessions on THIS browser */}
        {recentSessions.length > 0 && (
          <section className="mt-8">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Clock className="h-4 w-4 text-slate-500" />
                Phiên làm việc gần đây trên trình duyệt này (tối đa 24 giờ)
              </h2>
              <span className="text-xs text-slate-500">
                Chỉ hiển thị trên thiết bị của bạn
              </span>
            </div>

            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {recentSessions.map((item) => (
                <div
                  key={item.sessionId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-teal-700" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.domainLabelVi ? `${item.domainLabelVi} • ` : ""}
                        {formatRemainingHours(item.expiresAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/doc/${item.sessionId}`)}
                      className="cursor-pointer rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100"
                    >
                      Mở lại đọc tiếp
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === item.sessionId}
                      onClick={() => void handleDeleteRecent(item)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      title="Xóa ngay tài liệu & hội thoại khỏi máy chủ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}
