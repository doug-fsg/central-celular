const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator

export function useHaptic() {
  function vibrate(pattern: number | number[] = 10) {
    if (isSupported) {
      navigator.vibrate(pattern)
    }
  }

  function success() {
    vibrate([10, 30, 10])
  }

  function error() {
    vibrate([50, 20, 50])
  }

  function tap() {
    vibrate(8)
  }

  return { vibrate, success, error, tap }
}
