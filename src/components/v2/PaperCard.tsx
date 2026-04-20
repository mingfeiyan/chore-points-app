import { ReactNode } from "react";

interface PaperCardProps {
  children: ReactNode;
  className?: string;
}

export default function PaperCard({ children, className }: PaperCardProps) {
  return (
    <div
      className={`rounded-[14px] border border-pg-line bg-white p-5 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
