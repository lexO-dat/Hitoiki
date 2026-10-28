import { Component } from 'react';

// Catches a crash inside a screen so the rest of the app keeps working. `onError` may repair the cause
// (for example drop a damaged in-progress board) and return true: the screen is then retried once.
export default class ErrorBoundary extends Component {
  state = { error: null };
  retries = 0;

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
    const healed = this.props.onError?.(error);
    if (healed && this.retries < 1) {
      this.retries++;
      this.setState({ error: null });
    }
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error, () => this.setState({ error: null })) : this.props.children;
  }
}
