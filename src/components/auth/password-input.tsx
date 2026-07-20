"use client";

import { useId, useState } from "react";

type PasswordInputProps = {
  name: string;
  label: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
};

export function PasswordInput({
  name,
  label,
  autoComplete,
  required = false,
  minLength,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <label htmlFor={inputId} className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-violet-900">{label}</span>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
          className="brand-input pr-10"
        />
        <button
          type="button"
          onClick={() => {
            setVisible((current) => !current);
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-violet-500 hover:text-violet-800"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
        >
          {visible ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M3 3l18 18" strokeLinecap="round" />
              <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
              <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 8-0.46 1.24-1.14 2.35-1.97 3.28" />
              <path d="M6.11 6.11A10.94 10.94 0 0 0 3 13c1.73 4.89 6 8 9 8 1.02 0 2-.16 2.92-.45" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}
