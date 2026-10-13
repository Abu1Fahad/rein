export class HttpError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const notFound = (what = 'not_found') => new HttpError(404, what);

/** Wrap a sync/async route handler so thrown errors reach the error middleware. */
export const h = (fn) => (req, res, next) => {
  try {
    const out = fn(req, res, next);
    if (out && typeof out.then === 'function') {
      out.then((v) => { if (v !== undefined && !res.headersSent) res.json(v); }, next);
    } else if (out !== undefined && !res.headersSent) {
      res.json(out);
    }
  } catch (err) {
    next(err);
  }
};

export function toInt(value, { min = -Infinity, max = Infinity, def = null } = {}) {
  if (value === undefined || value === null || value === '') return def;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

export function toId(value) {
  const n = toInt(value, { min: 1 });
  return n === null ? null : n;
}

export function toStr(value, max = 200, { multiline = false } = {}) {
  if (value === undefined || value === null) return '';
  const control = multiline ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g;
  return String(value).replace(/\r\n?/g, '\n').replace(control, ' ').trim().slice(0, max);
}

export function oneOf(value, options, def) {
  return options.includes(value) ? value : def;
}
