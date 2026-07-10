type ConfirmOptions = { message: string; title?: string; confirmText?: string; cancelText?: string; isDanger?: boolean };
let resolveFn: ((value: boolean) => void) | null = null;
let listener: ((options: ConfirmOptions) => void) | null = null;

export const confirm = (options: string | ConfirmOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    resolveFn = resolve;
    if (listener) {
      listener(typeof options === 'string' ? { message: options } : options);
    } else {
      resolve(window.confirm(typeof options === 'string' ? options : options.message));
    }
  });
};

export const registerConfirmListener = (fn: (opts: ConfirmOptions) => void) => { listener = fn; };
export const resolveConfirm = (value: boolean) => { if (resolveFn) resolveFn(value); resolveFn = null; };