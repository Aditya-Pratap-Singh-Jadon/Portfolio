import { Component, useEffect, useRef } from "react";
export class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function ExternalLink({ href, children, className = "" }) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children} <span aria-hidden="true">↗</span>
    </a>
  );
}
export function SectionHeading({ title, subtitle, children }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        <p className="section-subtitle">{subtitle}</p>
      </div>
      {children || (
        <a className="back-hub" href="#explore">
          Back to overview ↖
        </a>
      )}
    </div>
  );
}
export function Dialog({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    document.body.classList.add("dialog-open");
    return () => {
      el.close();
      document.body.classList.remove("dialog-open");
    };
  }, []);
  return (
    <dialog
      data-scrollable
      ref={ref}
      className="detail-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      <div className="dialog-body">
        <button
          className="dialog-close"
          onClick={onClose}
          aria-label="Close details"
        >
          ×
        </button>
        {children}
      </div>
    </dialog>
  );
}
