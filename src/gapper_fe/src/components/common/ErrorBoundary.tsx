"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
  detail?: string;
  className?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ui-error-boundary]", error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className={
          this.props.className ??
          "rounded-xl border border-bearish/55 bg-bearish/10 p-3 text-xs text-bearish"
        }
      >
        <p className="font-semibold">{this.props.title ?? "Widget unavailable."}</p>
        <p className="mt-1 text-[11px] text-muted">
          {this.props.detail ?? "A render error was isolated to keep the rest of the UI active."}
        </p>
      </div>
    );
  }
}
