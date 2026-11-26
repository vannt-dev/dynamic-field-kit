// @dynamic-field-kit/angular/signal-forms
//
// A secondary entry point on purpose: it imports @angular/forms/signals, which
// only exists from Angular 22 on (stable there, experimental in 21). The main
// entry still supports Angular 16, so nothing from here may leak into it.
export * from './signal-form.store';
