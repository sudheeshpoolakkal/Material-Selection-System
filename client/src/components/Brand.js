import React from "react";
import { Link } from "react-router-dom";

export const starbaseMarkPath = "M16 0 21 11 32 16 21 21 16 32 11 21 0 16 11 11Z M16 11 11 16 16 21 21 16Z";

export function BrandMark({ className = "brand-mark", ...props }) {
  return <svg className={className} width="32" height="32" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}><path d={starbaseMarkPath} fillRule="evenodd" /></svg>;
}

export function Wordmark() {
  return <><BrandMark /><span>Starbase</span></>;
}

export default function Brand() {
  return <Link to="/" className="brand" aria-label="Starbase home"><Wordmark /></Link>;
}
