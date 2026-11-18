import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Đọc hiểu & Đối chiếu Bài báo Khoa học Tiếng Anh",
  description:
    "Phân tích bài báo khoa học PDF tiếng Anh sang tiếng Việt có dẫn chứng đối chiếu trang gốc dành cho nhóm nghiên cứu AI, Thủy điện và các ngành liên quan.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
