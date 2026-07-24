import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fieldRegistry } from '@dynamic-field-kit/core';
import { describe, expect, it } from 'vitest';

@Component({
  selector: 'dfk-smoke',
  standalone: true,
  template: `<span class="smoke">{{ label }}</span>`,
})
class SmokeComponent {
  label = 'mounted';
}

describe('vitest + Angular infrastructure', () => {
  it('imports @dynamic-field-kit/core', () => {
    expect(typeof fieldRegistry.register).toBe('function');
  });

  it('mounts a component through TestBed', () => {
    const fixture = TestBed.createComponent(SmokeComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement.querySelector('.smoke');
    expect(el.textContent).toBe('mounted');
  });
});
