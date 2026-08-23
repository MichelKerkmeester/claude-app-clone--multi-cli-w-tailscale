// ───────────────────────────────────────────────────────────────────
// MODULE: Ask-Question Keyboard Navigation
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. OPTIONS AND FOCUS TARGET TYPES
// ───────────────────────────────────────────────────────────────────

export interface UseAskQuestionKeyboardNavigationOptions {
  readonly identity: string | null;
  readonly enabled: boolean;
  readonly terminal: boolean;
  readonly optionCount: number;
  readonly hasFreeText: boolean;
  readonly freeTextRequired: boolean;
  readonly labelId: string;
  readonly optionsLabelId: string;
  readonly statusId: string;
  readonly errorId: string;
  readonly errorVisible: boolean;
  readonly submit: () => void;
}

type AnswerStop = HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement;

// ───────────────────────────────────────────────────────────────────
// 2. KEYBOARD NAVIGATION HOOK
// ───────────────────────────────────────────────────────────────────

export function useAskQuestionKeyboardNavigation(
  getCard: () => HTMLElement | null,
  getOptions: () => UseAskQuestionKeyboardNavigationOptions,
): void {
  let identityRef: string | null = getOptions().identity;
  let previousFocus: HTMLElement | null = null;
  let lastFocusedInCard: HTMLElement | null = null;
  let composition = false;
  let entered = false;

  // ───────────────────────────────────────────────────────────────────
  // 3. IDENTITY RESET
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    const identity = getOptions().identity;
    if (identityRef === identity) return;
    identityRef = identity;
    entered = false;
    previousFocus = null;
    lastFocusedInCard = null;
  });

  // ───────────────────────────────────────────────────────────────────
  // 4. ARIA ATTRIBUTE WIRING
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    const card = getCard();
    if (card === null) return;

    const current = getOptions();
    const heading = card.querySelector<HTMLElement>('h2');
    heading?.setAttribute('id', current.labelId);

    const status = card.querySelector<HTMLElement>('.ask-question-status');
    if (status !== null) {
      status.setAttribute('id', current.statusId);
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
    }

    const fieldset = card.querySelector<HTMLElement>('.ask-question-options');
    if (fieldset !== null) {
      fieldset.setAttribute('role', 'group');
      fieldset.setAttribute('aria-labelledby', current.optionsLabelId);
      fieldset.setAttribute(
        'aria-describedby',
        current.errorVisible ? `${current.statusId} ${current.errorId}` : current.statusId,
      );
    }

    const optionButtons = Array.from(
      card.querySelectorAll<HTMLButtonElement>('.ask-question-option-row'),
    );
    const activeOptions = optionButtons.filter((button) => !button.disabled);
    const focusedOption = activeOptions.find((button) => button === document.activeElement);
    const currentRovingOption = activeOptions.find((button) => button.tabIndex === 0);
    const rovingIndex = Math.max(
      0,
      focusedOption === undefined
        ? currentRovingOption === undefined
          ? 0
          : activeOptions.indexOf(currentRovingOption)
        : activeOptions.indexOf(focusedOption),
    );
    optionButtons.forEach((button) => {
      button.tabIndex =
        current.enabled && !current.terminal && activeOptions[rovingIndex] === button ? 0 : -1;
      const description = button.querySelector<HTMLElement>('.ask-question-option-description');
      if (description === null) {
        button.removeAttribute('aria-describedby');
        return;
      }
      const descriptionId = `${current.optionsLabelId}-description-${optionButtons.indexOf(button)}`;
      description.id = descriptionId;
      button.setAttribute('aria-describedby', descriptionId);
    });

    const textControl = card.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      '.ask-question-free-text textarea, .ask-question-free-text input',
    );
    const count = card.querySelector<HTMLElement>('.ask-question-free-text-count');
    if (count !== null) count.id = `${current.statusId}-count`;
    if (textControl !== null) {
      textControl.setAttribute('aria-required', String(current.freeTextRequired));
      const describedBy = [count?.id, current.statusId, current.errorVisible ? current.errorId : null]
        .filter((value): value is string => value !== undefined && value !== null)
        .join(' ');
      textControl.setAttribute('aria-describedby', describedBy);
      if (current.errorVisible) textControl.setAttribute('aria-errormessage', current.errorId);
      else textControl.removeAttribute('aria-errormessage');
    }
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. KEY AND FOCUS EVENT HANDLING
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    const card = getCard();
    if (card === null) return;

    const focusStop = (element: HTMLElement): void => {
      try {
        element.focus({ preventScroll: true });
      } catch {
        element.focus();
      }
      try {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch {
        // Some embedded WebViews expose focus but not scrollIntoView.
      }
    };

    const activeOptions = (): HTMLButtonElement[] =>
      Array.from(card.querySelectorAll<HTMLButtonElement>('.ask-question-option-row')).filter(
        (button) => !button.disabled,
      );

    const setRovingOption = (selected: HTMLButtonElement): void => {
      for (const option of card.querySelectorAll<HTMLButtonElement>('.ask-question-option-row')) {
        option.tabIndex = option === selected && !option.disabled ? 0 : -1;
      }
    };

    const moveTo = (event: KeyboardEvent, element: HTMLElement | undefined): void => {
      if (element === undefined || element.hasAttribute('disabled')) return;
      event.preventDefault();
      focusStop(element);
    };

    const getTextControl = (): HTMLTextAreaElement | HTMLInputElement | undefined =>
      card.querySelector<HTMLTextAreaElement | HTMLInputElement>(
        '.ask-question-free-text textarea:not(:disabled), .ask-question-free-text input:not(:disabled)',
      ) ?? undefined;

    const getSubmit = (): HTMLButtonElement | undefined =>
      card.querySelector<HTMLButtonElement>('.ask-question-submit:not(:disabled)') ?? undefined;

    const onFocusIn = (event: FocusEvent): void => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !card.contains(target)) return;
      const option = target.closest<HTMLButtonElement>('.ask-question-option-row');
      if (option !== null && card.contains(option)) {
        lastFocusedInCard = option;
        setRovingOption(option);
      } else if (isAnswerStop(target)) {
        lastFocusedInCard = target;
      }
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        try {
          target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        } catch {
          // Focus still remains the source of truth when a WebView lacks scrolling support.
        }
      }
    };

    const onCompositionStart = (): void => {
      composition = true;
    };

    const onCompositionEnd = (): void => {
      composition = false;
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      const current = getOptions();
      if (current.terminal || !current.enabled) return;
      const target = event.target;
      if (!(target instanceof HTMLElement) || !card.contains(target)) return;

      const option = target.closest<HTMLButtonElement>('.ask-question-option-row');
      if (option !== null && card.contains(option)) {
        if (option.disabled) return;
        const optionsInCard = activeOptions();
        const index = optionsInCard.indexOf(option);
        if (index < 0) return;

        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
          moveTo(event, optionsInCard[index + 1]);
          return;
        }
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
          moveTo(event, optionsInCard[index - 1]);
          return;
        }
        if (event.key === 'Home') {
          moveTo(event, optionsInCard[0]);
          return;
        }
        if (event.key === 'End') {
          moveTo(event, optionsInCard.at(-1));
          return;
        }
        if (event.key === 'Tab') {
          if (event.shiftKey) {
            moveTo(event, optionsInCard[index - 1]);
          } else {
            moveTo(event, getTextControl() ?? getSubmit());
          }
          return;
        }
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
          event.preventDefault();
          option.click();
        }
        return;
      }

      const textControl =
        target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement ? target : null;
      if (textControl !== null) {
        if (
          event.key === 'Enter' &&
          !event.shiftKey &&
          isSingleLineTextControl(textControl) &&
          !(event.isComposing || composition)
        ) {
          event.preventDefault();
          current.submit();
          return;
        }
        if (event.key === 'Tab' && event.shiftKey) {
          const optionsInCard = activeOptions();
          moveTo(event, optionsInCard.at(-1));
          return;
        }
        if (event.key === 'Tab' && !event.shiftKey) {
          moveTo(event, getSubmit());
        }
        return;
      }

      const submit = target.closest<HTMLButtonElement>('.ask-question-submit');
      if (submit === null || !card.contains(submit)) return;
      if (event.key === 'Tab' && event.shiftKey) {
        moveTo(event, getTextControl() ?? activeOptions().at(-1));
      }
    };

    card.addEventListener('focusin', onFocusIn);
    card.addEventListener('compositionstart', onCompositionStart);
    card.addEventListener('compositionend', onCompositionEnd);
    card.addEventListener('keydown', onKeyDown);
    return () => {
      card.removeEventListener('focusin', onFocusIn);
      card.removeEventListener('compositionstart', onCompositionStart);
      card.removeEventListener('compositionend', onCompositionEnd);
      card.removeEventListener('keydown', onKeyDown);

      const previous = previousFocus;
      const active = document.activeElement;
      if (
        previous !== null &&
        previous.isConnected &&
        !previous.hasAttribute('disabled') &&
        (active === document.body || active === card || card.contains(active))
      ) {
        focusStop(previous);
      }
    };
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. INITIAL FOCUS ON ENTRY
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    const card = getCard();
    if (card === null || entered) return;
    const current = getOptions();
    if (!current.enabled || current.terminal) return;
    const firstStop =
      activeAnswerStops(card)[0] ??
      card.querySelector<HTMLElement>(
        '.ask-question-free-text textarea:not(:disabled), .ask-question-free-text input:not(:disabled), .ask-question-submit:not(:disabled)',
      );
    if (firstStop === null || firstStop === undefined) return;

    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      entered = true;
      return;
    }
    entered = true;
    previousFocus = null;
    focusElement(firstStop);
  });

  // ───────────────────────────────────────────────────────────────────
  // 7. TERMINAL FOCUS RETURN
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    const card = getCard();
    if (card === null || !getOptions().terminal) return;
    const active = document.activeElement;
    if (lastFocusedInCard === null || (active !== document.body && !card.contains(active))) {
      return;
    }
    focusElement(card);
  });
}

// ───────────────────────────────────────────────────────────────────
// 8. FOCUS HELPERS
// ───────────────────────────────────────────────────────────────────

function activeAnswerStops(card: HTMLElement): AnswerStop[] {
  return Array.from(
    card.querySelectorAll<AnswerStop>(
      '.ask-question-option-row:not(:disabled), .ask-question-free-text textarea:not(:disabled), .ask-question-free-text input:not(:disabled), .ask-question-submit:not(:disabled)',
    ),
  );
}

function isAnswerStop(element: HTMLElement): element is AnswerStop {
  return element.matches(
    '.ask-question-option-row, .ask-question-free-text textarea, .ask-question-free-text input, .ask-question-submit',
  );
}

function isSingleLineTextControl(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  return (
    element instanceof HTMLInputElement ||
    (element instanceof HTMLTextAreaElement && element.rows <= 1)
  );
}

function focusElement(element: HTMLElement): void {
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
  try {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  } catch {
    // Some embedded WebViews expose focus but not scrollIntoView.
  }
}
