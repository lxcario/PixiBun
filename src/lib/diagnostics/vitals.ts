import { onCLS, onINP, onLCP, onTTFB, onFCP } from 'web-vitals';
import { captureDiagnostic } from './capture';

let vitalsInitialized = false;

export function initWebVitals(): void {
  if (typeof window === 'undefined' || vitalsInitialized) return;
  vitalsInitialized = true;

  const handleMetric = (metric: {
    name: string;
    value: number;
    rating?: string;
    id?: string;
    delta?: number;
  }) => {
    captureDiagnostic({
      kind: 'web-vital',
      message: `${metric.name}: ${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'} (${metric.rating || 'n/a'})`,
      detail: JSON.stringify(metric),
    });
  };

  try {
    onCLS(handleMetric);
    onINP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
    onFCP(handleMetric);
  } catch (err) {
    console.warn('Failed to initialize web-vitals tracking:', err);
  }
}
