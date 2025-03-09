export class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.initObservers();
  }

  initObservers() {
    // FCP Observer
    new PerformanceObserver((list) => {
      const fcp = list.getEntries()[0];
      this.metrics.fcp = fcp.startTime;
      this.logMetric('FCP', fcp.startTime);
    }).observe({ type: 'paint', buffered: true });

    // LCP Observer
    new PerformanceObserver((list) => {
      const lcp = list.getEntries().at(-1);
      this.metrics.lcp = lcp.startTime;
      this.logMetric('LCP', lcp.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // CLS Observer
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.metrics.cls = clsValue;
          this.logMetric('CLS', clsValue);
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  }

  logMetric(name, value) {
    console.debug(`📊 Performance: ${name} = ${value.toFixed(2)}`);
  }
}
