(() => {
  const report = (form, text, error = false) => {
    let status = form.querySelector('[data-form-status]');
    if (!status) {
      status = document.createElement('p');
      status.dataset.formStatus = 'true';
      status.setAttribute('role', 'status');
      status.className = 'mt-3';
      form.append(status);
    }
    status.textContent = text;
    status.setAttribute('aria-live', 'polite');
    status.style.color = error ? '#ff8d8d' : 'inherit';
  };

  async function submit(form) {
    const sheet = form.dataset.sheetForm;
    const values = Object.fromEntries(new FormData(form).entries());
    if (sheet === 'ContactRequests') {
      Object.assign(values, {
        name: values.name || form.querySelector('#cName')?.value || '',
        email: values.email || form.querySelector('#cEmail')?.value || '',
        topic: values.topic || form.querySelector('#cTopic')?.value || 'General question',
        phone: values.phone || form.querySelector('#cPhone')?.value || '',
        message: values.message || form.querySelector('#cMsg')?.value || '',
      });
    } else if (sheet === 'Newsletter') {
      values.email = values.email || form.querySelector('input[type="email"]')?.value || '';
      values.source = location.pathname;
    }
    values.submitted_at = new Date().toISOString();
    const button = form.querySelector('button[type="submit"],button:not([type])');
    const original = button?.textContent || '';
    if (button) { button.disabled = true; button.textContent = 'Sending…'; }
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet, row: values }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'Could not submit the form. Please try again.');
      form.reset();
      report(form, sheet === 'Newsletter' ? 'Thanks — your email has been added.' : 'Thanks. Your request has been received.');
    } catch (error) {
      report(form, error instanceof Error ? error.message : 'Could not submit the form. Please try again.', true);
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  document.querySelectorAll('form[data-sheet-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (form.reportValidity()) void submit(form);
    }, true);
  });
})();
