import { useCallback, useEffect, useState } from 'react';
import { listBrandPresets, type BrandPreset } from '@/features/account/api/brand-presets';

export type BrandPresetsState =
  { status: 'error' } | { status: 'loading' } | { presets: BrandPreset[]; status: 'ready' };

export function useBrandPresets() {
  const [state, setState] = useState<BrandPresetsState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setState({ status: 'loading' });
    void listBrandPresets(controller.signal)
      .then((presets) => {
        setState({ presets, status: 'ready' });
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setState({ status: 'error' });
        }
      });

    return () => controller.abort();
  }, [version]);

  const retry = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { retry, state };
}
