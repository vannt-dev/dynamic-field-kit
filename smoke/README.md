# @dynamic-field-kit/smoke

Render smoke tests that import each adapter's **built dist** as a real consumer
would and mount a component through the real framework runtime on jsdom.

- React (`react.smoke.test.tsx`) and Vue (`vue.smoke.test.ts`) are covered here.
- Angular is intentionally **not** render-smoked: mounting its built fesm2022
  output via TestBed outside a real Angular app needs JIT/app bootstrapping that
  is too fragile for a smoke test. Angular's built dist stays covered at the
  import + registry-wiring level by `scripts/integration-cross-registry.js`.
