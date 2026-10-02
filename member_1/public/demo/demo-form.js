/**
 * PRAYAS 3.0 - Demo Form Controller
 * 
 * Features:
 * - Form reset control with voice announcement
 * - Barrier Inspector toggle for hackathon presentations
 * - Prevents automatic submission: enforces manual user confirmation
 */

export class DemoFormController {
  constructor() {
    this.form = document.getElementById('job-application-form');
    this.btnReset = document.getElementById('btn-reset-demo');
    this.btnToggleBarriers = document.getElementById('btn-toggle-barriers');
    this.showBarriers = true;

    this._bindEvents();
  }

  _bindEvents() {
    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => this.resetForm());
    }

    if (this.btnToggleBarriers) {
      this.btnToggleBarriers.addEventListener('click', () => {
        this.showBarriers = !this.showBarriers;
        document.querySelectorAll('.barrier-callout').forEach(el => {
          el.style.display = this.showBarriers ? 'inline-flex' : 'none';
        });
        this.btnToggleBarriers.textContent = this.showBarriers 
          ? 'Hide Accessibility Barrier Callouts' 
          : 'Show Accessibility Barrier Callouts';
      });
    }

    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('🎉 Application submitted successfully by candidate! (PRAYAS assisted without automatic submission)');
      });
    }
  }

  /**
   * Clear all fields and return to clean demo state
   */
  resetForm() {
    if (!this.form) return;
    this.form.reset();
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => {
      el.value = '';
    });
    console.log('[PRAYAS Demo] Form reset to initial state.');
  }
}
