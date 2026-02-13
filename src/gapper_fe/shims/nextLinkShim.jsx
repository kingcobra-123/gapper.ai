import React from "react";

function toHref(href) {
  if (typeof href === "string") {
    return href;
  }

  if (!href || typeof href !== "object") {
    return "/";
  }

  const pathname = href.pathname || "/";
  const query = href.query
    ? `?${new URLSearchParams(href.query).toString()}`
    : "";
  const hash = href.hash ? `#${href.hash}` : "";

  return `${pathname}${query}${hash}`;
}

const Link = React.forwardRef(function LinkShim(
  { href, children, onClick, ...rest },
  ref
) {
  return (
    <a ref={ref} href={toHref(href)} onClick={onClick} {...rest}>
      {children}
    </a>
  );
});

export default Link;
