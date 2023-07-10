import { Spinner, wait } from './deps.ts'

let _spinner: Spinner

export const spinner = (initialText?: string) => {
  if (initialText) {
    if (_spinner) {
      _spinner.stop()
    }
    _spinner = wait(initialText).start()
    return _spinner
  }
  if (_spinner) {
    return _spinner
  }
  _spinner = wait(initialText ?? '').start()
  return _spinner
}
