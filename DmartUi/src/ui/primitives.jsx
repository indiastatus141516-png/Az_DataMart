import React from "react";

const join = (...classes) => classes.filter(Boolean).join(" ");

const spacingScale = (value) => {
  if (value === 0) return "0px";
  if (typeof value === "number") return `${value * 8}px`;
  return value;
};

const resolveColor = (value) => {
  if (typeof value !== "string") return value;
  const map = {
    "primary.main": "#7C3AED",
    "secondary.main": "#4C5A7C",
    "text.secondary": "#4C5A7C",
    "text.primary": "#0F172A",
    "error.main": "#EF4444",
    "warning.main": "#F59E0B",
    "success.main": "#22C55E",
    "grey.50": "#F6F8FF",
    "grey.100": "#EEF2FF",
    "grey.400": "#7B88A8",
  };
  return map[value] || value;
};

const sxToStyle = (sx) => {
  if (!sx || typeof sx !== "object") return {};
  const style = {};
  for (const [key, value] of Object.entries(sx)) {
    if (value == null) continue;
    if (typeof value === "object") continue;
    switch (key) {
      case "m":
        style.margin = spacingScale(value);
        break;
      case "mt":
        style.marginTop = spacingScale(value);
        break;
      case "mb":
        style.marginBottom = spacingScale(value);
        break;
      case "ml":
        style.marginLeft = spacingScale(value);
        break;
      case "mr":
        style.marginRight = spacingScale(value);
        break;
      case "mx":
        style.marginLeft = spacingScale(value);
        style.marginRight = spacingScale(value);
        break;
      case "my":
        style.marginTop = spacingScale(value);
        style.marginBottom = spacingScale(value);
        break;
      case "p":
        style.padding = spacingScale(value);
        break;
      case "pt":
        style.paddingTop = spacingScale(value);
        break;
      case "pb":
        style.paddingBottom = spacingScale(value);
        break;
      case "pl":
        style.paddingLeft = spacingScale(value);
        break;
      case "pr":
        style.paddingRight = spacingScale(value);
        break;
      case "px":
        style.paddingLeft = spacingScale(value);
        style.paddingRight = spacingScale(value);
        break;
      case "py":
        style.paddingTop = spacingScale(value);
        style.paddingBottom = spacingScale(value);
        break;
      case "bgcolor":
        style.backgroundColor = resolveColor(value);
        break;
      default:
        if (key === "color") {
          style.color = resolveColor(value);
        } else {
          style[key] = value;
        }
    }
  }
  return style;
};

export const Box = ({ sx, className, ...props }) => (
  <div className={className} style={sxToStyle(sx)} {...props} />
);

export const Container = ({
  className,
  sx,
  maxWidth = "lg",
  disableGutters = false,
  ...props
}) => {
  const widthClass =
    {
      xs: "max-w-xl",
      sm: "max-w-2xl",
      md: "max-w-4xl",
      lg: "max-w-6xl",
      xl: "max-w-[1280px]",
      false: "max-w-none",
    }[String(maxWidth)] || "max-w-6xl";

  return (
    <div
      className={join(
        "mx-auto w-full",
        widthClass,
        disableGutters ? "" : "px-4 sm:px-6",
        className,
      )}
      style={sxToStyle(sx)}
      {...props}
    />
  );
};

export const Typography = ({
  variant = "body1",
  component,
  gutterBottom,
  className,
  sx,
  color,
  children,
  ...props
}) => {
  const toneMap = {
    "text.secondary": "text-text-secondary",
    "text.primary": "text-text-primary",
    primary: "text-text-primary",
    error: "text-accent-danger",
    warning: "text-accent-warning",
    success: "text-accent-success",
  };
  const map = {
    h1: "text-4xl font-semibold",
    h2: "text-3xl font-semibold",
    h3: "text-2xl font-semibold",
    h4: "text-xl font-semibold",
    h5: "text-lg font-semibold",
    h6: "text-base font-semibold",
    body1: "text-sm text-text-primary",
    body2: "text-xs text-text-secondary",
  };
  const Tag = component || (variant.startsWith("h") ? variant : "p");
  return (
    <Tag
      className={join(
        map[variant] || map.body1,
        toneMap[color],
        gutterBottom ? "mb-2" : "",
        className,
      )}
      style={sxToStyle(sx)}
      {...props}
    >
      {children}
    </Tag>
  );
};

export const Grid = ({
  container,
  item,
  spacing = 0,
  xs,
  sm,
  md,
  lg,
  xl,
  size,
  className,
  sx,
  children,
  ...props
}) => {
  const gapClass =
    {
      0: "gap-0",
      1: "gap-1",
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
      5: "gap-5",
      6: "gap-6",
    }[spacing] || "gap-4";

  if (container) {
    return (
      <div
        className={join("grid grid-cols-12", gapClass, className)}
        style={sxToStyle(sx)}
        {...props}
      >
        {children}
      </div>
    );
  }

  const gridSize = size || { xs, sm, md, lg, xl };
  const cols = [
    gridSize?.xs ? `col-span-${gridSize.xs}` : null,
    gridSize?.sm ? `sm:col-span-${gridSize.sm}` : null,
    gridSize?.md ? `md:col-span-${gridSize.md}` : null,
    gridSize?.lg ? `lg:col-span-${gridSize.lg}` : null,
    gridSize?.xl ? `xl:col-span-${gridSize.xl}` : null,
  ];

  return (
    <div
      className={join(cols.join(" "), className)}
      style={sxToStyle(sx)}
      {...props}
    >
      {children}
    </div>
  );
};

export const Card = ({ className, sx, ...props }) => (
  <div
    className={join("crm-card", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const CardContent = ({ className, sx, ...props }) => (
  <div
    className={join("crm-card-body", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const Paper = ({ className, sx, ...props }) => (
  <div
    className={join("crm-card", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const Button = ({
  variant = "contained",
  color = "primary",
  size = "medium",
  startIcon,
  fullWidth,
  component,
  className,
  sx,
  children,
  ...props
}) => {
  const sizes = {
    small: "px-3 py-1.5 text-xs",
    medium: "px-4 py-2 text-sm",
    large: "px-5 py-3 text-sm",
  };
  const variants = {
    contained:
      color === "error"
        ? "bg-accent-danger text-white hover:shadow-[0_0_16px_rgba(239,68,68,0.35)]"
        : color === "warning"
          ? "bg-accent-warning text-white hover:shadow-[0_0_16px_rgba(245,158,11,0.35)]"
          : color === "success"
            ? "bg-accent-success text-white hover:shadow-[0_0_16px_rgba(34,197,94,0.35)]"
            : "bg-accent-primary text-white hover:shadow-glow",
    outlined:
      "border border-border bg-bg-card text-text-secondary hover:border-accent-primary/40 hover:text-text-primary",
    text: "text-text-secondary hover:text-text-primary",
  };
  const Tag = component || "button";
  return (
    <Tag
      className={join(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold uppercase tracking-[0.1em] transition",
        sizes[size] || sizes.medium,
        variants[variant] || variants.contained,
        fullWidth ? "w-full" : "",
        className,
      )}
      style={sxToStyle(sx)}
      {...props}
    >
      {startIcon ? <span className="text-base">{startIcon}</span> : null}
      {children}
    </Tag>
  );
};

export const Table = ({ className, sx, size, stickyHeader, ...props }) => (
  <table
    className={join("crm-table", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const TableHead = ({ className, sx, ...props }) => (
  <thead
    className={join("crm-thead", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const TableBody = ({ className, sx, ...props }) => (
  <tbody className={className} style={sxToStyle(sx)} {...props} />
);

export const TableRow = ({ className, sx, hover, ...props }) => (
  <tr
    className={join("crm-row", hover ? "crm-row-hover" : "", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const TableCell = ({
  className,
  sx,
  component,
  align,
  padding,
  ...props
}) => {
  const isHeaderCell =
    component === "th" ||
    (typeof className === "string" && className.includes("crm-cell-head"));
  const Tag = isHeaderCell ? "th" : "td";
  return (
    <Tag
      className={join(
        "crm-cell",
        padding === "checkbox" ? "w-12 px-3 text-center" : "",
        align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "",
        className,
      )}
      style={sxToStyle(sx)}
      scope={isHeaderCell ? "col" : undefined}
      {...props}
    />
  );
};

export const TableContainer = ({ className, sx, component, ...props }) => (
  <div
    className={join(
      "overflow-x-auto rounded-2xl border border-border bg-bg-card",
      className,
    )}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const Chip = ({ label, className, sx, color, size, ...props }) => {
  const tones = {
    primary: "bg-[#F1ECFF] text-accent-primary border border-accent-primary/30",
    success: "bg-[#0F2A1A] text-accent-success border border-accent-success/30",
    warning: "bg-[#2A1F0A] text-accent-warning border border-accent-warning/30",
    error: "bg-[#2A0A0A] text-accent-danger border border-accent-danger/30",
    info: "bg-[#0F1116] text-text-secondary border border-border",
  };
  const sizes = {
    small: "px-2 py-0.5 text-[11px]",
    medium: "px-3 py-1 text-xs",
  };
  return (
    <span
      className={join(
        "inline-flex items-center rounded-full font-semibold",
        sizes[size] || sizes.medium,
        tones[color] || "bg-slate-100 text-slate-600",
        className,
      )}
      style={sxToStyle(sx)}
      {...props}
    >
      {label}
    </span>
  );
};

export const Alert = ({
  severity = "info",
  className,
  sx,
  children,
  onClose,
}) => {
  const tones = {
    error: "border-accent-danger/40 bg-[#2A0A0A] text-accent-danger",
    success: "border-accent-success/40 bg-[#0F2A1A] text-accent-success",
    warning: "border-accent-warning/40 bg-[#2A1F0A] text-accent-warning",
    info: "border-border bg-[#0F1116] text-text-secondary",
  };
  return (
    <div
      className={join(
        "flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm",
        tones[severity] || tones.info,
        className,
      )}
      style={sxToStyle(sx)}
    >
      <div>{children}</div>
      {onClose ? (
        <button className="text-xs font-semibold" onClick={onClose}>
          Close
        </button>
      ) : null}
    </div>
  );
};

export const TextField = ({
  label,
  placeholder,
  sx,
  className,
  InputProps,
  InputLabelProps,
  inputProps,
  multiline,
  rows,
  fullWidth,
  variant,
  margin,
  size,
  ...props
}) => {
  const inputClass = join("crm-field", fullWidth ? "w-full" : "");
  const startAdornment = InputProps?.startAdornment;
  const endAdornment = InputProps?.endAdornment;
  const readOnly = InputProps?.readOnly || inputProps?.readOnly;
  const inputMin = InputProps?.inputProps?.min ?? inputProps?.min;

  const FieldTag = multiline ? "textarea" : "input";
  const fieldProps = {
    placeholder,
    readOnly,
    min: inputMin,
    ...(multiline ? { rows } : {}),
    ...props,
  };

  return (
    <label
      className={join(
        "block text-sm text-text-secondary",
        fullWidth ? "w-full" : "",
        className,
      )}
      style={sxToStyle(sx)}
    >
      {label ? (
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          {label}
        </span>
      ) : null}
      <div className="relative flex items-center gap-2">
        {startAdornment ? (
          <span className="text-text-muted">{startAdornment}</span>
        ) : null}
        <FieldTag className={inputClass} {...fieldProps} />
        {endAdornment ? (
          <span className="text-text-muted">{endAdornment}</span>
        ) : null}
      </div>
    </label>
  );
};

export const Dialog = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="crm-dialog relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export const DialogTitle = ({ className, sx, ...props }) => (
  <h3
    className={join("crm-dialog-title", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const DialogContent = ({ className, sx, ...props }) => (
  <div
    className={join("mt-3 space-y-3", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const DialogActions = ({ className, sx, ...props }) => (
  <div
    className={join("crm-dialog-actions", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const Avatar = ({ className, sx, children, ...props }) => (
  <div
    className={join(
      "flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary/15 text-accent-primary",
      className,
    )}
    style={sxToStyle(sx)}
    {...props}
  >
    {children}
  </div>
);

export const IconButton = ({
  className,
  sx,
  children,
  size = "medium",
  color,
  ...props
}) => {
  const sizes = {
    small: "h-8 w-8",
    medium: "h-9 w-9",
    large: "h-11 w-11",
  };
  const tones = {
    error: "text-accent-danger hover:bg-[#2A0A0A]",
    primary: "text-text-secondary hover:bg-bg-hover",
  };
  return (
    <button
      className={join(
        "inline-flex items-center justify-center rounded-lg border border-border bg-bg-card",
        sizes[size] || sizes.medium,
        tones[color] || "text-text-secondary hover:bg-bg-hover",
        className,
      )}
      style={sxToStyle(sx)}
      {...props}
    >
      {children}
    </button>
  );
};

export const Toolbar = ({ className, sx, ...props }) => (
  <div
    className={join("flex items-center gap-3", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const Drawer = ({ open, anchor = "left", children, onClose }) => {
  if (!open) return null;
  const side = anchor === "right" ? "right-0" : "left-0";
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose}></div>
      <aside
        className={join(
          "absolute top-0 h-full w-72 bg-slate-900 text-white shadow-2xl",
          side,
        )}
      >
        {children}
      </aside>
    </div>
  );
};

export const List = ({ className, sx, ...props }) => (
  <div
    className={join("space-y-2", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const ListItem = ({ button, className, sx, ...props }) => (
  <div
    className={join(
      "flex items-center gap-3 rounded-xl px-3 py-2",
      button ? "cursor-pointer hover:bg-white/10" : "",
      className,
    )}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const ListItemIcon = ({ className, sx, ...props }) => (
  <span
    className={join("text-lg text-cyan-200", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const ListItemText = ({ primary, secondary }) => (
  <div className="flex flex-col">
    <span className="text-sm font-semibold text-white">{primary}</span>
    {secondary ? (
      <span className="text-xs text-slate-400">{secondary}</span>
    ) : null}
  </div>
);

export const Divider = ({ className, sx, ...props }) => (
  <hr
    className={join("border-border/60", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const Badge = ({ badgeContent, children }) => (
  <div className="relative inline-flex">
    {children}
    {badgeContent !== undefined && badgeContent !== null ? (
      <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
        {badgeContent}
      </span>
    ) : null}
  </div>
);

export const Checkbox = ({ className, sx, indeterminate, ...props }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={join(
        "h-4 w-4 rounded border-border bg-bg-card text-accent-primary focus:ring-accent-primary/60",
        className,
      )}
      style={sxToStyle(sx)}
      {...props}
    />
  );
};

export const Select = ({
  className,
  sx,
  children,
  label,
  fullWidth,
  ...props
}) => (
  <select
    className={join(
      "rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary",
      fullWidth ? "w-full" : "",
      className,
    )}
    style={sxToStyle(sx)}
    {...props}
  >
    {children}
  </select>
);

export const MenuItem = ({ className, sx, ...props }) => (
  <option className={className} style={sxToStyle(sx)} {...props} />
);

export const Accordion = ({ children, defaultExpanded }) => (
  <details
    className="rounded-2xl border border-border bg-bg-card"
    open={defaultExpanded}
  >
    {children}
  </details>
);

export const AccordionSummary = ({ children }) => (
  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-text-primary">
    {children}
  </summary>
);

export const AccordionDetails = ({ children }) => (
  <div className="border-t border-border px-4 py-3 text-sm text-text-secondary">
    {children}
  </div>
);

export const FormControl = ({ className, sx, size, fullWidth, ...props }) => (
  <div
    className={join("min-w-[160px]", fullWidth ? "w-full" : "", className)}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const InputLabel = ({ className, sx, ...props }) => (
  <label
    className={join(
      "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted",
      className,
    )}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const Tabs = ({ value, onChange, className, variant, children }) => {
  const items = React.Children.toArray(children);
  return (
    <div
      className={join(
        "flex flex-wrap gap-2 pb-3",
        variant === "fullWidth" ? "justify-between" : "",
        className,
      )}
    >
      {items.map((child, index) =>
        React.cloneElement(child, {
          _index: index,
          _selected: (child.props.value ?? index) === value,
          _onSelect: (event) => onChange?.(event, child.props.value ?? index),
        }),
      )}
    </div>
  );
};

export const Tab = ({ label, icon, _selected, _onSelect }) => (
  <button
    type="button"
    onClick={_onSelect}
    className={join(
      "flex shrink-0 whitespace-nowrap items-center gap-2 rounded-lg px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition",
      _selected
        ? "border border-accent-primary/40 bg-bg-card text-accent-primary shadow-[0_0_16px_rgba(124,58,237,0.18)]"
        : "border border-transparent text-text-secondary hover:border-border hover:bg-bg-hover",
    )}
  >
    {icon ? <span className="text-base">{icon}</span> : null}
    {label}
  </button>
);

export const AppBar = ({ className, sx, ...props }) => (
  <div
    className={join(
      "rounded-2xl border border-border bg-bg-card px-4 py-3 shadow-card",
      className,
    )}
    style={sxToStyle(sx)}
    {...props}
  />
);

export const InputAdornment = ({ children }) => (
  <span className="text-text-muted">{children}</span>
);
