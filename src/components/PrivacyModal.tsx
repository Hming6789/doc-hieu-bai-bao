"use client";

import React from "react";
import { Clock, Lock, Server, ShieldAlert, Trash2, X } from "lucide-react";

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
  onDeleteCurrentSession?: () => void;
  hasActiveRealSession?: boolean;
}

export function PrivacyModal({
  open,
  onClose,
  onDeleteCurrentSession,
  hasActiveRealSession = false,
}: PrivacyModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Cơ chế Phiên riêng tư (Không đăng nhập) & Nơi xử lý dữ liệu
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm leading-relaxed text-slate-700">
          <div className="flex gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3.5">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
            <div>
              <p className="font-semibold text-teal-950">
                1. Tách biệt tuyệt đối giữa các phiên sử dụng
              </p>
              <p className="mt-1 text-teal-900/90">
                Mỗi lần tải tệp PDF, hệ thống sinh một khóa bí mật ngẫu nhiên
                256-bit chỉ lưu trên trình duyệt hiện tại của bạn. Website{" "}
                <strong>không có thư viện chung</strong>, không tự động tạo liên
                kết chia sẻ công khai và không hiển thị tài liệu của bạn cho bất
                kỳ người dùng nào khác.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
            <div>
              <p className="font-semibold text-slate-900">
                2. Thời gian lưu tạm 24 giờ & Mở lại phiên
              </p>
              <p className="mt-1">
                Tệp PDF gốc, dữ liệu trích xuất và lịch sử hỏi đáp được lưu tạm{" "}
                <strong>tối đa 24 giờ</strong> để bạn tiện mở lại đọc tiếp trên
                cùng trình duyệt/thiết bị này nếu lỡ đóng tab. Sau 24 giờ, hệ
                thống tự động xóa vĩnh viễn khỏi máy chủ. Bạn cũng có thể bấm{" "}
                <strong>Xóa phiên ngay</strong> bất cứ lúc nào sau khi đọc xong.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <Server className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
            <div>
              <p className="font-semibold text-slate-900">
                3. Nơi xử lý AI & OCR bên ngoài
              </p>
              <p className="mt-1">
                Văn bản trích xuất và hình ảnh trang scan/bảng biểu/công thức
                được gửi qua kết nối mã hóa HTTPS tới{" "}
                <strong>Google Gemini API</strong> (mặc định mô hình{" "}
                <code>gemini-3.8-flash</code>). Lưu ý minh bạch theo chính sách
                Google AI Studio: với khóa gói trả phí (Paid Tier), dữ liệu API
                không được dùng để huấn luyện mô hình; với khóa gói miễn phí
                (Free Tier), Google có thể xử lý dữ liệu để cải thiện chất lượng
                dịch vụ — do đó chỉ nên dùng cho bài báo khoa học công bố/học
                thuật thông thường.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold text-amber-950">
                4. Giới hạn trung thực của mô hình không tài khoản & Bảo mật
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-amber-950/90">
                <li>
                  Vì không có mật khẩu tài khoản cá nhân, người khác dùng trực
                  tiếp máy tính/trình duyệt đang mở của bạn trong vòng 24 giờ có
                  thể mở lại phiên đó. Hãy bấm <strong>Xóa phiên ngay</strong>{" "}
                  nếu sử dụng máy tính chung.
                </li>
                <li>
                  Không hứa hẹn bảo mật tuyệt đối cấp mật: vui lòng chỉ tải bài
                  báo khoa học và tài liệu học thuật phục vụ nghiên cứu, không
                  tải tài liệu mật nhà nước hoặc hợp đồng NDA nghiêm ngặt.
                </li>
                <li>
                  Mọi văn bản bên trong PDF được đóng khung như dữ liệu tham
                  khảo không đáng tin cậy, ngăn chặn chỉ dẫn độc hại ẩn trong
                  tệp điều khiển hệ thống.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5 rounded-b-2xl">
          {hasActiveRealSession && onDeleteCurrentSession ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeleteCurrentSession();
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Xóa ngay tài liệu & hội thoại hiện tại
            </button>
          ) : (
            <span className="text-xs text-slate-500">
              Dữ liệu phiên tự động hủy sau 24 giờ.
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
