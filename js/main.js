/* ================================================================
   00. COMMON — shared behavior for every page
================================================================ */

/* Mobile navigation */
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.addEventListener('click', (event) => {
    if (!event.target.closest('a')) {
      return;
    }

    siteNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
}

/* Current year in the footer */
const yearElement = document.getElementById('year');

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

/* Current-page state in the main navigation */
const currentPage =
  window.location.pathname.split('/').pop() || 'index.html';

const parentNavigationPages = {
  'transportation.html': 'venue.html',
  'accommodation.html': 'venue.html',
  'local-information.html': 'venue.html'
};

const activeNavigationPage =
  parentNavigationPages[currentPage] || currentPage;

document.querySelectorAll('.site-nav a').forEach((link) => {
  const linkPage = link.getAttribute('href');

  link.removeAttribute('aria-current');

  if (linkPage === activeNavigationPage) {
    link.setAttribute(
      'aria-current',
      linkPage === currentPage ? 'page' : 'location'
    );
  }
});

/* ================================================================
   10. HOME — continuous invited-speaker slider
================================================================ */

const speakerSliderTrack = document.getElementById(
  'speaker-slider-track'
);
const speakerSliderPrevious = document.querySelector(
  '.speaker-slider-prev'
);
const speakerSliderNext = document.querySelector(
  '.speaker-slider-next'
);

if (
  speakerSliderTrack &&
  speakerSliderPrevious &&
  speakerSliderNext
) {
  const speakerSlider = speakerSliderTrack.closest(
    '.speaker-slider'
  );

  const continuousScrollSpeed = 25;
  const resumeDelay = 200;

  speakerSliderTrack
    .querySelectorAll('[data-speaker-clone]')
    .forEach((clone) => clone.remove());

  const originalSlides = Array.from(
    speakerSliderTrack.children
  ).filter((element) => {
    return element.classList.contains('speaker-slide');
  });

  let originalStart = 0;
  let cycleWidth = 0;
  let previousAnimationTime = null;
  let scrollRemainder = 0;
  let isPointerOver = false;
  let isDragging = false;
  let isManualScrolling = false;
  let hasKeyboardFocus = false;
  let hasDragged = false;
  let preventNextClick = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let pauseUntil = 0;
  let manualScrollTimer = null;

  /* Duplicate one set before and after the original slides. */
  const createSpeakerClone = (slide) => {
    const clone = slide.cloneNode(true);

    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('tabindex', '-1');
    clone.dataset.speakerClone = 'true';

    return clone;
  };

  const beforeClones = originalSlides.map(createSpeakerClone);
  const afterClones = originalSlides.map(createSpeakerClone);

  speakerSliderTrack.prepend(...beforeClones);
  speakerSliderTrack.append(...afterClones);

  /* Measure the original set so equivalent positions can be swapped. */
  const measureSpeakerSlider = (keepPosition = false) => {
    if (!originalSlides.length || !afterClones.length) {
      return;
    }

    let progress = 0;

    if (keepPosition && cycleWidth > 0) {
      progress =
        (speakerSliderTrack.scrollLeft - originalStart) /
        cycleWidth;
    }

    originalStart = originalSlides[0].offsetLeft;
    cycleWidth =
      afterClones[0].offsetLeft - originalStart;

    if (keepPosition) {
      const normalizedProgress =
        ((progress % 1) + 1) % 1;

      speakerSliderTrack.scrollLeft =
        originalStart + normalizedProgress * cycleWidth;
    } else {
      speakerSliderTrack.scrollLeft = originalStart;
    }
  };

  const getSpeakerSlideDistance = () => {
    const firstSlide = originalSlides[0];

    if (!firstSlide) {
      return 0;
    }

    const trackStyle = window.getComputedStyle(
      speakerSliderTrack
    );
    const trackGap =
      parseFloat(trackStyle.columnGap) || 0;

    return (
      firstSlide.getBoundingClientRect().width + trackGap
    );
  };

  const normalizeSpeakerSliderPosition = () => {
    if (cycleWidth <= 0) {
      return;
    }

    while (
      speakerSliderTrack.scrollLeft >=
      originalStart + cycleWidth
    ) {
      speakerSliderTrack.scrollLeft -= cycleWidth;
    }

    while (
      speakerSliderTrack.scrollLeft < originalStart
    ) {
      speakerSliderTrack.scrollLeft += cycleWidth;
    }
  };

  const shouldPauseSpeakerSlider = (currentTime) => {
    return (
      document.hidden ||
      isPointerOver ||
      isDragging ||
      isManualScrolling ||
      hasKeyboardFocus ||
      currentTime < pauseUntil
    );
  };

  /* Move by a small time-based distance for constant-speed motion. */
  const animateSpeakerSlider = (currentTime) => {
    if (previousAnimationTime === null) {
      previousAnimationTime = currentTime;
    }

    const elapsedTime = Math.min(
      currentTime - previousAnimationTime,
      250
    );

    previousAnimationTime = currentTime;

    if (!shouldPauseSpeakerSlider(currentTime)) {
      scrollRemainder +=
        continuousScrollSpeed * (elapsedTime / 1000);

      const wholePixels = Math.floor(scrollRemainder);

      if (wholePixels > 0) {
        speakerSliderTrack.scrollLeft += wholePixels;
        scrollRemainder -= wholePixels;

        normalizeSpeakerSliderPosition();
      }
    }

    window.requestAnimationFrame(animateSpeakerSlider);
  };

  document.addEventListener('visibilitychange', () => {
    previousAnimationTime = null;
    scrollRemainder = 0;
  });

  /* Arrow buttons move exactly one slide in either direction. */
  const moveSpeakerManually = (direction) => {
    const slideDistance = getSpeakerSlideDistance();

    if (slideDistance <= 0) {
      return;
    }

    isManualScrolling = true;
    window.clearTimeout(manualScrollTimer);

    speakerSliderTrack.scrollBy({
      left: direction * slideDistance,
      behavior: 'smooth'
    });

    manualScrollTimer = window.setTimeout(() => {
      normalizeSpeakerSliderPosition();
      isManualScrolling = false;
      pauseUntil = performance.now() + resumeDelay;
    }, 450);
  };

  speakerSliderPrevious.addEventListener('click', () => {
    moveSpeakerManually(-1);
  });

  speakerSliderNext.addEventListener('click', () => {
    moveSpeakerManually(1);
  });

  /* Hover pauses the continuous movement. */
  speakerSlider.addEventListener('mouseenter', () => {
    isPointerOver = true;
  });

  speakerSlider.addEventListener('mouseleave', () => {
    isPointerOver = false;
    pauseUntil = performance.now() + resumeDelay;
  });

  /* Pointer drag starts without capturing an ordinary link click. */
  speakerSliderTrack.addEventListener(
    'pointerdown',
    (event) => {
      if (
        event.pointerType === 'mouse' &&
        event.button !== 0
      ) {
        return;
      }

      isDragging = true;
      hasDragged = false;
      hasKeyboardFocus = false;
      dragStartX = event.clientX;
      dragStartScrollLeft = speakerSliderTrack.scrollLeft;
    }
  );

  speakerSliderTrack.addEventListener(
    'pointermove',
    (event) => {
      if (!isDragging) {
        return;
      }

      const dragDistance = event.clientX - dragStartX;

      if (Math.abs(dragDistance) > 6 && !hasDragged) {
        hasDragged = true;
        speakerSliderTrack.classList.add('is-dragging');
        speakerSliderTrack.setPointerCapture(event.pointerId);
      }

      if (!hasDragged) {
        return;
      }

      event.preventDefault();
      speakerSliderTrack.scrollLeft =
        dragStartScrollLeft - dragDistance;
      normalizeSpeakerSliderPosition();
    }
  );

  const finishSpeakerDrag = (event) => {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    speakerSliderTrack.classList.remove('is-dragging');

    if (
      speakerSliderTrack.hasPointerCapture(event.pointerId)
    ) {
      speakerSliderTrack.releasePointerCapture(
        event.pointerId
      );
    }

    normalizeSpeakerSliderPosition();
    pauseUntil = performance.now() + resumeDelay;

    if (hasDragged) {
      preventNextClick = true;

      window.setTimeout(() => {
        preventNextClick = false;
      }, 120);
    }
  };

  window.addEventListener('pointerup', finishSpeakerDrag);
  window.addEventListener('pointercancel', finishSpeakerDrag);

  /* Prevent only the accidental click immediately after a drag. */
  speakerSliderTrack.addEventListener(
    'click',
    (event) => {
      if (!preventNextClick) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      preventNextClick = false;
    },
    true
  );

  speakerSlider.addEventListener('focusin', () => {
    if (!isPointerOver) {
      hasKeyboardFocus = true;
    }
  });

  speakerSlider.addEventListener('focusout', () => {
    window.setTimeout(() => {
      hasKeyboardFocus = speakerSlider.contains(
        document.activeElement
      );
    }, 0);
  });

  window.addEventListener('resize', () => {
    measureSpeakerSlider(true);
  });

  window.requestAnimationFrame(() => {
    measureSpeakerSlider(false);
    window.requestAnimationFrame(animateSpeakerSlider);
  });
}


/* ================================================================
   20. PROGRAM — unavailable document buttons
================================================================ */

document
  .querySelectorAll('.program-download-button.is-preparing')
  .forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      alert(
        'This content is currently being prepared and will be available soon.'
      );
    });
  });


/* ================================================================
   50. ABSTRACT SUBMISSION — presenter information dialog
================================================================ */

const presenterInfoButtons = document.querySelectorAll(
  '#presenter-info-open, #email-presenter-info-open'
);
const presenterModal = document.getElementById(
  'presenter-modal'
);
const presenterModalClose = document.getElementById(
  'presenter-modal-close'
);

if (
  presenterInfoButtons.length &&
  presenterModal &&
  presenterModalClose
) {
  for (const button of presenterInfoButtons) {
    button.addEventListener('click', () => presenterModal.showModal());
  }

  presenterModalClose.addEventListener('click', () => {
    presenterModal.close();
  });

  presenterModal.addEventListener('click', (event) => {
    if (event.target === presenterModal) {
      presenterModal.close();
    }
  });
}

/* Abstract submission method tabs */
(() => {
  const tabList = document.querySelector('.submission-tabs');
  if (!tabList) return;
  const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));

  function activateTab(selected, moveFocus = false) {
    for (const tab of tabs) {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
    if (moveFocus) selected.focus();
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (event) => {
      const index = tabs.indexOf(tab);
      const positions = {
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!Object.hasOwn(positions, event.key)) return;
      event.preventDefault();
      activateTab(tabs[positions[event.key]], true);
    });
  }

  const templateDialog = document.getElementById('online-template-dialog');
  if (!templateDialog) return;

  document.getElementById('online-template-open').addEventListener('click', () => {
    templateDialog.showModal();
  });
  document.getElementById('online-template-download').addEventListener('click', () => {
    templateDialog.close();
  });
  document.getElementById('online-template-email').addEventListener('click', () => {
    templateDialog.close();
    activateTab(document.getElementById('submission-email-tab'), true);
  });
  templateDialog.addEventListener('click', (event) => {
    if (event.target === templateDialog) templateDialog.close();
  });

})();