// Only the explicitly marked marketplace demo may substitute example values.
export function fillDemoForm(form) {
  if (form?.dataset.demo !== 'true') return;
  for (const field of form.elements) {
    if (field.value?.trim() === '' && field.dataset.demoDefault !== undefined) {
      field.value = field.dataset.demoDefault;
      form.dataset.demoFilled = 'true';
    }
  }
  form.dispatchEvent(new Event('input', { bubbles: true }));
}

export function prepareDemoForms(root, defaults, message) {
  if (document.body.dataset.demo !== 'true') return;
  for (const form of root.querySelectorAll('form')) {
    form.dataset.demo = 'true';
    form.noValidate = true;
    for (const field of form.elements) {
      if (!field.name || !['INPUT', 'TEXTAREA'].includes(field.tagName) || ['file', 'hidden', 'checkbox'].includes(field.type)) continue;
      const fallback = field.defaultValue || defaults[field.name];
      if (fallback === undefined) continue;
      field.dataset.demoDefault = field.type === 'number' ? String(Math.min(Number(field.max || Infinity), Math.max(Number(field.min || 0), Number(fallback)))) : String(fallback);
      if (field.value?.trim() === '') field.value = field.dataset.demoDefault;
    }
    if (!form.querySelector('.demo-form-note')) {
      const note = document.createElement('p');
      note.className = 'form-warning demo-form-note';
      note.textContent = message;
      (form.querySelector('.transport-panel') || form).prepend(note);
    }
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button?.form || button.form.dataset.demo !== 'true' || (button.type !== 'submit' && button.dataset.transport !== 'save')) return;
  fillDemoForm(button.form);
  if (!button.form.reportValidity()) { event.preventDefault(); event.stopImmediatePropagation(); }
}, true);

document.addEventListener('submit', event => {
  if (event.target.dataset.demo !== 'true') return;
  fillDemoForm(event.target);
  if (!event.target.reportValidity()) { event.preventDefault(); event.stopImmediatePropagation(); }
}, true);
