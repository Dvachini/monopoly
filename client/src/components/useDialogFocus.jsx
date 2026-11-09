import { useEffect } from 'react';

// Focus the first control of a dialog when it opens and give focus back to
// whatever had it before when the dialog closes or unmounts.
function useDialogFocus(active, ref) {
  useEffect(() => {
    if (!active) return undefined;
    const previous = document.activeElement;
    if (ref.current) {
      const first = ref.current.querySelector(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
      );
      (first || ref.current).focus();
    }
    return () => {
      if (previous && previous.isConnected && previous.focus) previous.focus();
    };
  }, [active]);
}

export default useDialogFocus;
