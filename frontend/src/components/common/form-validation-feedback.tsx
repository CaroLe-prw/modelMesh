import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { showFormValidationToast } from '@/components/common/form-validation-toast';

type ValidatableControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const validationToastId = 'form-validation-feedback';

function isValidatableControl(element: unknown): element is ValidatableControl {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

function normalizeLabel(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() || undefined;
}

function resolveFieldLabel(control: ValidatableControl, fallback: string) {
  return (
    normalizeLabel(control.labels?.[0]?.textContent) ??
    normalizeLabel(control.getAttribute('aria-label')) ??
    normalizeLabel(control.getAttribute('placeholder')) ??
    normalizeLabel(control.name) ??
    fallback
  );
}

export function FormValidationFeedback() {
  const { t } = useTranslation();

  useEffect(() => {
    const pendingForms = new WeakSet<HTMLFormElement>();

    function handleInvalid(event: Event) {
      const control = event.target;
      if (!isValidatableControl(control)) return;

      const form = control.form;
      if (!form) return;

      event.preventDefault();
      control.setAttribute('aria-invalid', 'true');
      if (pendingForms.has(form)) return;

      pendingForms.add(form);
      queueMicrotask(() => {
        pendingForms.delete(form);

        const invalidControls = Array.from(form.elements).filter(
          (element): element is ValidatableControl =>
            isValidatableControl(element) && element.willValidate && !element.validity.valid,
        );
        if (invalidControls.length === 0) return;

        const issues = invalidControls.map((invalidControl) => {
          invalidControl.setAttribute('aria-invalid', 'true');
          const field = resolveFieldLabel(invalidControl, t('common.formValidation.unknownField'));
          const validity = invalidControl.validity;

          if (validity.valueMissing) {
            return t('common.formValidation.issues.required', { field });
          }
          if (validity.typeMismatch && invalidControl instanceof HTMLInputElement) {
            if (invalidControl.type === 'email') {
              return t('common.formValidation.issues.email', { field });
            }
            if (invalidControl.type === 'url') {
              return t('common.formValidation.issues.url', { field });
            }
          }
          if (validity.tooShort && !(invalidControl instanceof HTMLSelectElement)) {
            return t('common.formValidation.issues.tooShort', {
              field,
              min: invalidControl.minLength,
            });
          }
          if (validity.tooLong && !(invalidControl instanceof HTMLSelectElement)) {
            return t('common.formValidation.issues.tooLong', {
              field,
              max: invalidControl.maxLength,
            });
          }
          if (validity.rangeUnderflow && invalidControl instanceof HTMLInputElement) {
            return t('common.formValidation.issues.rangeUnderflow', {
              field,
              min: invalidControl.min,
            });
          }
          if (validity.rangeOverflow && invalidControl instanceof HTMLInputElement) {
            return t('common.formValidation.issues.rangeOverflow', {
              field,
              max: invalidControl.max,
            });
          }
          if (validity.badInput) {
            return t('common.formValidation.issues.number', { field });
          }
          if (validity.stepMismatch) {
            return t('common.formValidation.issues.step', { field });
          }
          if (validity.patternMismatch) {
            return t('common.formValidation.issues.pattern', { field });
          }
          return t('common.formValidation.issues.invalid', { field });
        });

        showFormValidationToast({
          description: t('common.formValidation.description', {
            count: invalidControls.length,
          }),
          id: validationToastId,
          issues,
          title: t('common.formValidation.title'),
        });
        invalidControls[0]?.focus();
      });
    }

    function handleInput(event: Event) {
      const control = event.target;
      if (!isValidatableControl(control)) return;
      if (control.validity.valid) control.removeAttribute('aria-invalid');
    }

    document.addEventListener('invalid', handleInvalid, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('change', handleInput, true);
    return () => {
      document.removeEventListener('invalid', handleInvalid, true);
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('change', handleInput, true);
    };
  }, [t]);

  return null;
}
