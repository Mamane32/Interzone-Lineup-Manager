import { HTMLAttributes } from "react";

export default function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`surface-panel p-5 ${className}`}
      {...props}
    />
  );
}
