import React from "react";

interface PageTitleProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function PageTitle({
  title,
  subtitle,
  children,
}: PageTitleProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl font-bold text-gray-50 font-exo2">{title}</h2>
      {subtitle && <p className="text-sm text-gray-300">{subtitle}</p>}
      <hr className="border-gray-600 max-w-md" />
      {children}
    </div>
  );
}
